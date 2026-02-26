from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import hmac
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="LAUTECH Rentals API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)
JWT_SECRET = os.environ.get('JWT_SECRET', 'lautech-rentals-secret-key-change-in-production')
KORALPAY_SECRET = os.environ.get('KORALPAY_SECRET_KEY', '')
KORALPAY_WEBHOOK_SECRET = os.environ.get('KORALPAY_WEBHOOK_SECRET', '')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    suspended: bool
    created_at: str

class AgentVerificationRequest(BaseModel):
    id_card_url: str
    selfie_url: str
    address: str

class PropertyCreate(BaseModel):
    title: str
    description: str
    price: int
    location: str
    property_type: str  # hostel or apartment
    images: List[str]
    contact_name: str
    contact_phone: str

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    location: Optional[str] = None
    property_type: Optional[str] = None
    images: Optional[List[str]] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None

class TokenPurchaseRequest(BaseModel):
    quantity: int
    email: str
    phone_number: str

class InspectionRequest(BaseModel):
    property_id: str
    inspection_date: str
    email: str
    phone_number: str

class RoleUpdateRequest(BaseModel):
    user_id: str
    role: str

class SuspendUserRequest(BaseModel):
    user_id: str
    suspended: bool

class ApprovalRequest(BaseModel):
    status: str  # approved or rejected

class InspectionUpdateRequest(BaseModel):
    status: Optional[str] = None
    agent_id: Optional[str] = None

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    }
    token_data = json.dumps(payload)
    signature = hmac.new(JWT_SECRET.encode(), token_data.encode(), hashlib.sha256).hexdigest()
    import base64
    return base64.b64encode(f"{token_data}|{signature}".encode()).decode()

def verify_token(token: str) -> dict:
    try:
        import base64
        decoded = base64.b64decode(token.encode()).decode()
        token_data, signature = decoded.rsplit('|', 1)
        expected_sig = hmac.new(JWT_SECRET.encode(), token_data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(token_data)
        exp = datetime.fromisoformat(payload['exp'])
        if datetime.now(timezone.utc) > exp:
            return None
        return payload
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get('suspended'):
        raise HTTPException(status_code=403, detail="Account suspended")
    return user

async def require_role(user: dict, roles: List[str]):
    if user['role'] not in roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

def generate_reference(prefix: str) -> str:
    return f"{prefix}-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "role": "user",
        "suspended": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create wallet
    await db.wallets.insert_one({
        "user_id": user_id,
        "token_balance": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = generate_token(user_id, "user")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": data.email,
            "full_name": data.full_name,
            "role": "user",
            "suspended": False
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or user['password'] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get('suspended'):
        raise HTTPException(status_code=403, detail="Account suspended")
    
    token = generate_token(user['id'], user['role'])
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "role": user['role'],
            "suspended": user['suspended']
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user['id']}, {"_id": 0})
    return {
        "id": user['id'],
        "email": user['email'],
        "full_name": user['full_name'],
        "role": user['role'],
        "suspended": user['suspended'],
        "token_balance": wallet.get('token_balance', 0) if wallet else 0
    }

# ============== AGENT VERIFICATION ROUTES ==============

@api_router.post("/agent-verification/request")
async def request_agent_verification(data: AgentVerificationRequest, user: dict = Depends(get_current_user)):
    if user['role'] != 'user':
        raise HTTPException(status_code=400, detail="Only regular users can request agent verification")
    
    existing = await db.agent_verification_requests.find_one({
        "user_id": user['id'],
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending verification request")
    
    request_id = str(uuid.uuid4())
    verification = {
        "id": request_id,
        "user_id": user['id'],
        "user_name": user['full_name'],
        "user_email": user['email'],
        "id_card_url": data.id_card_url,
        "selfie_url": data.selfie_url,
        "address": data.address,
        "status": "pending",
        "reviewed_by_admin_id": None,
        "reviewed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.agent_verification_requests.insert_one(verification)
    return {"message": "Verification request submitted", "request_id": request_id}

@api_router.get("/agent-verification/my-request")
async def get_my_verification_request(user: dict = Depends(get_current_user)):
    request = await db.agent_verification_requests.find_one(
        {"user_id": user['id']},
        {"_id": 0}
    )
    return request

@api_router.get("/agent-verification/pending")
async def get_pending_verifications(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    requests = await db.agent_verification_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).to_list(100)
    return requests

@api_router.get("/agent-verification/all")
async def get_all_verifications(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    requests = await db.agent_verification_requests.find({}, {"_id": 0}).to_list(500)
    return requests

@api_router.post("/agent-verification/{request_id}/review")
async def review_verification(request_id: str, data: ApprovalRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    
    verification = await db.agent_verification_requests.find_one({"id": request_id})
    if not verification:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.agent_verification_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": data.status,
            "reviewed_by_admin_id": user['id'],
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if data.status == "approved":
        await db.users.update_one(
            {"id": verification['user_id']},
            {"$set": {"role": "agent"}}
        )
    
    return {"message": f"Verification {data.status}"}

# ============== PROPERTY ROUTES ==============

@api_router.post("/properties")
async def create_property(data: PropertyCreate, user: dict = Depends(get_current_user)):
    await require_role(user, ['agent', 'admin'])
    
    property_id = str(uuid.uuid4())
    property_doc = {
        "id": property_id,
        "title": data.title,
        "description": data.description,
        "price": data.price,
        "location": data.location,
        "property_type": data.property_type,
        "images": data.images,
        "contact_name": data.contact_name,
        "contact_phone": data.contact_phone,
        "uploaded_by_agent_id": user['id'],
        "uploaded_by_agent_name": user['full_name'],
        "status": "pending",
        "approved_by_admin_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.properties.insert_one(property_doc)
    return {"message": "Property created", "property_id": property_id}

@api_router.get("/properties")
async def get_properties(
    status: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None
):
    query = {}
    if status:
        query["status"] = status
    else:
        query["status"] = "approved"  # Default to approved for public
    
    if property_type:
        query["property_type"] = property_type
    
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
        if not query["price"]:
            del query["price"]
    
    properties = await db.properties.find(query, {"_id": 0}).to_list(500)
    return properties

@api_router.get("/properties/my-listings")
async def get_my_listings(user: dict = Depends(get_current_user)):
    await require_role(user, ['agent', 'admin'])
    properties = await db.properties.find(
        {"uploaded_by_agent_id": user['id']},
        {"_id": 0}
    ).to_list(500)
    return properties

@api_router.get("/properties/pending")
async def get_pending_properties(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    properties = await db.properties.find({"status": "pending"}, {"_id": 0}).to_list(500)
    return properties

@api_router.get("/properties/all")
async def get_all_properties(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    properties = await db.properties.find({}, {"_id": 0}).to_list(500)
    return properties

@api_router.get("/properties/{property_id}")
async def get_property(property_id: str, user: dict = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if user has unlocked this property
    unlock = await db.unlocks.find_one({
        "user_id": user['id'],
        "property_id": property_id
    })
    
    response = dict(property_doc)
    response['contact_unlocked'] = unlock is not None
    
    # Hide contact info if not unlocked (and not agent/admin)
    if not unlock and user['role'] == 'user':
        response['contact_phone'] = "***LOCKED***"
    
    return response

@api_router.get("/properties/{property_id}/public")
async def get_property_public(property_id: str):
    property_doc = await db.properties.find_one(
        {"id": property_id, "status": "approved"},
        {"_id": 0}
    )
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    response = dict(property_doc)
    response['contact_phone'] = "***LOCKED***"
    response['contact_unlocked'] = False
    return response

@api_router.put("/properties/{property_id}")
async def update_property(property_id: str, data: PropertyUpdate, user: dict = Depends(get_current_user)):
    await require_role(user, ['agent', 'admin'])
    
    property_doc = await db.properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if user['role'] == 'agent' and property_doc['uploaded_by_agent_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to edit this property")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.properties.update_one({"id": property_id}, {"$set": update_data})
    
    return {"message": "Property updated"}

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    
    result = await db.properties.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": "Property deleted"}

@api_router.post("/properties/{property_id}/approve")
async def approve_property(property_id: str, data: ApprovalRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {
            "status": data.status,
            "approved_by_admin_id": user['id']
        }}
    )
    return {"message": f"Property {data.status}"}

# ============== WALLET & TOKEN ROUTES ==============

@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user['id']}, {"_id": 0})
    if not wallet:
        wallet = {
            "user_id": user['id'],
            "token_balance": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
    return wallet

@api_router.get("/wallet/{user_id}")
async def get_user_wallet(user_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    return wallet

@api_router.post("/tokens/purchase")
async def initiate_token_purchase(data: TokenPurchaseRequest, user: dict = Depends(get_current_user)):
    reference = generate_reference("TOKEN")
    amount = data.quantity * 1000  # ₦1000 per token
    
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "reference": reference,
        "amount": amount,
        "tokens_added": data.quantity,
        "status": "pending",
        "koralpay_reference": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    # Return checkout URL (in production, integrate with KoralPay API)
    koralpay_public_key = os.environ.get('KORALPAY_PUBLIC_KEY', 'pk_test_xxx')
    checkout_url = f"https://checkout.korapay.com/checkout?amount={amount}&currency=NGN&reference={reference}&merchant={koralpay_public_key}"
    
    return {
        "reference": reference,
        "amount": amount,
        "quantity": data.quantity,
        "checkout_url": checkout_url,
        "payment_type": "token_purchase"
    }

@api_router.post("/properties/{property_id}/unlock")
async def unlock_property_contact(property_id: str, user: dict = Depends(get_current_user)):
    # Check if already unlocked
    existing = await db.unlocks.find_one({
        "user_id": user['id'],
        "property_id": property_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already unlocked")
    
    # Check wallet balance
    wallet = await db.wallets.find_one({"user_id": user['id']})
    if not wallet or wallet.get('token_balance', 0) < 1:
        raise HTTPException(status_code=400, detail="Insufficient token balance")
    
    # Check property exists
    property_doc = await db.properties.find_one({"id": property_id, "status": "approved"})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Deduct token
    await db.wallets.update_one(
        {"user_id": user['id']},
        {"$inc": {"token_balance": -1}}
    )
    
    # Create unlock record
    unlock = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "property_id": property_id,
        "unlocked_at": datetime.now(timezone.utc).isoformat()
    }
    await db.unlocks.insert_one(unlock)
    
    return {
        "message": "Contact unlocked",
        "contact_name": property_doc['contact_name'],
        "contact_phone": property_doc['contact_phone']
    }

@api_router.get("/unlocks")
async def get_my_unlocks(user: dict = Depends(get_current_user)):
    unlocks = await db.unlocks.find({"user_id": user['id']}, {"_id": 0}).to_list(500)
    
    # Get property details for each unlock
    result = []
    for unlock in unlocks:
        property_doc = await db.properties.find_one(
            {"id": unlock['property_id']},
            {"_id": 0}
        )
        if property_doc:
            result.append({
                **unlock,
                "property": property_doc
            })
    
    return result

# ============== INSPECTION ROUTES ==============

@api_router.post("/inspections")
async def request_inspection(data: InspectionRequest, user: dict = Depends(get_current_user)):
    # Check property exists
    property_doc = await db.properties.find_one({"id": data.property_id, "status": "approved"})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    reference = generate_reference("INSP")
    inspection_id = str(uuid.uuid4())
    
    inspection = {
        "id": inspection_id,
        "user_id": user['id'],
        "user_name": user['full_name'],
        "user_email": user['email'],
        "property_id": data.property_id,
        "property_title": property_doc['title'],
        "agent_id": property_doc['uploaded_by_agent_id'],
        "agent_name": property_doc.get('uploaded_by_agent_name', ''),
        "inspection_date": data.inspection_date,
        "status": "pending",
        "payment_status": "pending",
        "payment_reference": reference,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.inspections.insert_one(inspection)
    
    # Create inspection transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "inspection_id": inspection_id,
        "user_id": user['id'],
        "reference": reference,
        "amount": 2000,
        "status": "pending",
        "koralpay_reference": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.inspection_transactions.insert_one(transaction)
    
    koralpay_public_key = os.environ.get('KORALPAY_PUBLIC_KEY', 'pk_test_xxx')
    checkout_url = f"https://checkout.korapay.com/checkout?amount=2000&currency=NGN&reference={reference}&merchant={koralpay_public_key}"
    
    return {
        "inspection_id": inspection_id,
        "reference": reference,
        "amount": 2000,
        "checkout_url": checkout_url,
        "payment_type": "inspection"
    }

@api_router.get("/inspections")
async def get_my_inspections(user: dict = Depends(get_current_user)):
    inspections = await db.inspections.find(
        {"user_id": user['id']},
        {"_id": 0}
    ).to_list(500)
    return inspections

@api_router.get("/inspections/assigned")
async def get_assigned_inspections(user: dict = Depends(get_current_user)):
    await require_role(user, ['agent', 'admin'])
    inspections = await db.inspections.find(
        {"agent_id": user['id']},
        {"_id": 0}
    ).to_list(500)
    return inspections

@api_router.get("/inspections/all")
async def get_all_inspections(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    inspections = await db.inspections.find({}, {"_id": 0}).to_list(500)
    return inspections

@api_router.put("/inspections/{inspection_id}")
async def update_inspection(inspection_id: str, data: InspectionUpdateRequest, user: dict = Depends(get_current_user)):
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Agents can only mark their assigned inspections as completed
    if user['role'] == 'agent':
        if inspection['agent_id'] != user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        if data.status and data.status not in ['completed']:
            raise HTTPException(status_code=403, detail="Agents can only mark as completed")
    
    update_data = {}
    if data.status:
        update_data['status'] = data.status
    if data.agent_id and user['role'] == 'admin':
        # Get agent name
        agent = await db.users.find_one({"id": data.agent_id}, {"_id": 0})
        update_data['agent_id'] = data.agent_id
        update_data['agent_name'] = agent['full_name'] if agent else ''
    
    if update_data:
        await db.inspections.update_one({"id": inspection_id}, {"$set": update_data})
    
    return {"message": "Inspection updated"}

@api_router.get("/inspections/{inspection_id}/agent-contact")
async def get_inspection_agent_contact(inspection_id: str, user: dict = Depends(get_current_user)):
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    if inspection['user_id'] != user['id'] and user['role'] not in ['admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if inspection['payment_status'] != 'completed':
        raise HTTPException(status_code=400, detail="Payment not completed")
    
    agent = await db.users.find_one({"id": inspection['agent_id']}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "agent_name": agent['full_name'],
        "agent_email": agent['email']
    }

# ============== TRANSACTION ROUTES ==============

@api_router.get("/transactions")
async def get_my_transactions(user: dict = Depends(get_current_user)):
    token_txs = await db.transactions.find(
        {"user_id": user['id']},
        {"_id": 0}
    ).to_list(500)
    
    inspection_txs = await db.inspection_transactions.find(
        {"user_id": user['id']},
        {"_id": 0}
    ).to_list(500)
    
    return {
        "token_transactions": token_txs,
        "inspection_transactions": inspection_txs
    }

@api_router.get("/transactions/all")
async def get_all_transactions(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    
    token_txs = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    inspection_txs = await db.inspection_transactions.find({}, {"_id": 0}).to_list(1000)
    
    return {
        "token_transactions": token_txs,
        "inspection_transactions": inspection_txs
    }

# ============== USER MANAGEMENT (ADMIN) ==============

@api_router.get("/users")
async def get_all_users(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    return target_user

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: RoleUpdateRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    
    if data.role not in ['user', 'agent', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": data.role}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"Role updated to {data.role}"}

@api_router.put("/users/{user_id}/suspend")
async def suspend_user(user_id: str, data: SuspendUserRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"suspended": data.suspended}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {'suspended' if data.suspended else 'unsuspended'}"}

# ============== ADMIN DASHBOARD STATS ==============

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    await require_role(user, ['admin'])
    
    total_users = await db.users.count_documents({})
    total_agents = await db.users.count_documents({"role": "agent"})
    total_properties = await db.properties.count_documents({})
    approved_properties = await db.properties.count_documents({"status": "approved"})
    pending_properties = await db.properties.count_documents({"status": "pending"})
    total_inspections = await db.inspections.count_documents({})
    pending_inspections = await db.inspections.count_documents({"status": "pending"})
    completed_inspections = await db.inspections.count_documents({"status": "completed"})
    pending_verifications = await db.agent_verification_requests.count_documents({"status": "pending"})
    
    # Revenue calculations
    token_revenue = 0
    token_txs = await db.transactions.find({"status": "completed"}).to_list(10000)
    for tx in token_txs:
        token_revenue += tx.get('amount', 0)
    
    inspection_revenue = 0
    insp_txs = await db.inspection_transactions.find({"status": "completed"}).to_list(10000)
    for tx in insp_txs:
        inspection_revenue += tx.get('amount', 0)
    
    return {
        "total_users": total_users,
        "total_agents": total_agents,
        "total_properties": total_properties,
        "approved_properties": approved_properties,
        "pending_properties": pending_properties,
        "total_inspections": total_inspections,
        "pending_inspections": pending_inspections,
        "completed_inspections": completed_inspections,
        "pending_verifications": pending_verifications,
        "token_revenue": token_revenue,
        "inspection_revenue": inspection_revenue,
        "total_revenue": token_revenue + inspection_revenue
    }

# ============== WEBHOOK HANDLERS ==============

@api_router.post("/webhooks/koralpay")
async def handle_koralpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("x-korapay-signature", "")
    
    # Verify signature (in production)
    if KORALPAY_WEBHOOK_SECRET:
        import base64
        expected_sig = base64.b64encode(
            hmac.new(KORALPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).digest()
        ).decode()
        if not hmac.compare_digest(signature, expected_sig):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        payload = json.loads(body.decode())
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event = payload.get("event")
    data = payload.get("data", {})
    reference = data.get("reference", "")
    
    logger.info(f"Webhook received: {event} for {reference}")
    
    if event == "charge.success":
        # Check if token transaction
        token_tx = await db.transactions.find_one({"reference": reference})
        if token_tx:
            await db.transactions.update_one(
                {"reference": reference},
                {"$set": {
                    "status": "completed",
                    "koralpay_reference": data.get("korapay_reference")
                }}
            )
            # Add tokens to wallet
            await db.wallets.update_one(
                {"user_id": token_tx['user_id']},
                {"$inc": {"token_balance": token_tx['tokens_added']}}
            )
            logger.info(f"Token purchase completed: {reference}")
        
        # Check if inspection transaction
        insp_tx = await db.inspection_transactions.find_one({"reference": reference})
        if insp_tx:
            await db.inspection_transactions.update_one(
                {"reference": reference},
                {"$set": {
                    "status": "completed",
                    "koralpay_reference": data.get("korapay_reference")
                }}
            )
            # Update inspection payment status
            await db.inspections.update_one(
                {"id": insp_tx['inspection_id']},
                {"$set": {
                    "payment_status": "completed",
                    "status": "assigned"
                }}
            )
            logger.info(f"Inspection payment completed: {reference}")
    
    elif event == "charge.failed":
        await db.transactions.update_one(
            {"reference": reference},
            {"$set": {"status": "failed"}}
        )
        await db.inspection_transactions.update_one(
            {"reference": reference},
            {"$set": {"status": "failed"}}
        )
    
    return {"status": "success"}

@api_router.post("/payments/verify/{reference}")
async def verify_payment(reference: str, user: dict = Depends(get_current_user)):
    # Check token transaction
    token_tx = await db.transactions.find_one({"reference": reference}, {"_id": 0})
    if token_tx:
        return {
            "type": "token_purchase",
            "status": token_tx['status'],
            "amount": token_tx['amount'],
            "tokens": token_tx['tokens_added']
        }
    
    # Check inspection transaction
    insp_tx = await db.inspection_transactions.find_one({"reference": reference}, {"_id": 0})
    if insp_tx:
        return {
            "type": "inspection",
            "status": insp_tx['status'],
            "amount": insp_tx['amount']
        }
    
    raise HTTPException(status_code=404, detail="Transaction not found")

# Simulate payment completion (for testing without KoralPay)
@api_router.post("/payments/simulate/{reference}")
async def simulate_payment(reference: str):
    # This is for testing only - remove in production
    token_tx = await db.transactions.find_one({"reference": reference})
    if token_tx:
        await db.transactions.update_one(
            {"reference": reference},
            {"$set": {"status": "completed"}}
        )
        await db.wallets.update_one(
            {"user_id": token_tx['user_id']},
            {"$inc": {"token_balance": token_tx['tokens_added']}}
        )
        return {"message": "Token payment simulated", "tokens_added": token_tx['tokens_added']}
    
    insp_tx = await db.inspection_transactions.find_one({"reference": reference})
    if insp_tx:
        await db.inspection_transactions.update_one(
            {"reference": reference},
            {"$set": {"status": "completed"}}
        )
        await db.inspections.update_one(
            {"id": insp_tx['inspection_id']},
            {"$set": {"payment_status": "completed", "status": "assigned"}}
        )
        return {"message": "Inspection payment simulated"}
    
    raise HTTPException(status_code=404, detail="Transaction not found")

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "LAUTECH Rentals API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
