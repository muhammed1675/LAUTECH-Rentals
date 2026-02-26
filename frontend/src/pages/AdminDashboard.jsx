import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { adminAPI, userAPI, verificationAPI, propertyAPI, inspectionAPI, transactionAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { LayoutDashboard, Users, Shield, Building2, Calendar, Receipt, CheckCircle2, XCircle, Eye, Ban, UserCheck, TrendingUp, Coins, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [transactions, setTransactions] = useState({ token_transactions: [], inspection_transactions: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!isAdmin) { toast.error('Access denied'); navigate('/'); return; }
    fetchData();
  }, [isAuthenticated, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, verificationsRes, propertiesRes, inspectionsRes, txRes] = await Promise.all([
        adminAPI.getStats(), userAPI.getAll(), verificationAPI.getAll(), propertyAPI.getAllAdmin(), inspectionAPI.getAll(), transactionAPI.getAll(),
      ]);
      setStats(statsRes.data); setUsers(usersRes.data); setVerifications(verificationsRes.data);
      setProperties(propertiesRes.data); setInspections(inspectionsRes.data); setTransactions(txRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally { setLoading(false); }
  };

  const handleUpdateRole = async (userId, role) => {
    try { await userAPI.updateRole(userId, role); toast.success('Role updated'); fetchData(); } catch (error) { toast.error('Failed to update role'); }
  };

  const handleSuspendUser = async (userId, suspended) => {
    try { await userAPI.suspend(userId, suspended); toast.success(suspended ? 'User suspended' : 'User unsuspended'); fetchData(); } catch (error) { toast.error('Failed to update user'); }
  };

  const handleReviewVerification = async (requestId, status) => {
    try { await verificationAPI.review(requestId, status, user.id); toast.success(`Verification ${status}`); setSelectedVerification(null); fetchData(); } catch (error) { toast.error('Failed to review'); }
  };

  const handleApproveProperty = async (propertyId, status) => {
    try { await propertyAPI.approve(propertyId, status, user.id); toast.success(`Property ${status}`); fetchData(); } catch (error) { toast.error('Failed to update property'); }
  };

  const handleDeleteProperty = async (propertyId) => {
    try { await propertyAPI.delete(propertyId); toast.success('Property deleted'); fetchData(); } catch (error) { toast.error('Failed to delete property'); }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);
  const getStatusBadge = (status) => ({ pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', completed: 'bg-green-100 text-green-800', assigned: 'bg-blue-100 text-blue-800' }[status] || 'bg-gray-100 text-gray-800');
  const filteredUsers = users.filter(u => !searchTerm || u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1><p className="text-muted-foreground mt-1">Manage users, properties, and operations</p></div>
        <Button onClick={fetchData} variant="outline" className="gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="w-4 h-4" /><span className="hidden sm:inline">Overview</span></TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /><span className="hidden sm:inline">Users</span></TabsTrigger>
          <TabsTrigger value="verification" className="gap-2"><Shield className="w-4 h-4" /><span className="hidden sm:inline">Verification</span>{stats?.pending_verifications > 0 && <Badge variant="destructive" className="ml-1">{stats.pending_verifications}</Badge>}</TabsTrigger>
          <TabsTrigger value="properties" className="gap-2"><Building2 className="w-4 h-4" /><span className="hidden sm:inline">Properties</span>{stats?.pending_properties > 0 && <Badge variant="destructive" className="ml-1">{stats.pending_properties}</Badge>}</TabsTrigger>
          <TabsTrigger value="inspections" className="gap-2"><Calendar className="w-4 h-4" /><span className="hidden sm:inline">Inspections</span></TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2"><Receipt className="w-4 h-4" /><span className="hidden sm:inline">Transactions</span></TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {loading ? <div className="grid md:grid-cols-4 gap-4">{[1,2,3,4,5,6,7,8].map(i => <Card key={i} className="p-6 animate-pulse"><div className="h-16 bg-muted rounded" /></Card>)}</div> : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Users</p><p className="text-3xl font-bold mt-1">{stats?.total_users || 0}</p></div><Users className="w-8 h-8 text-primary" /></div></Card>
                <Card className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Agents</p><p className="text-3xl font-bold mt-1">{stats?.total_agents || 0}</p></div><UserCheck className="w-8 h-8 text-secondary" /></div></Card>
                <Card className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Properties</p><p className="text-3xl font-bold mt-1">{stats?.total_properties || 0}</p></div><Building2 className="w-8 h-8 text-primary" /></div></Card>
                <Card className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Inspections</p><p className="text-3xl font-bold mt-1">{stats?.total_inspections || 0}</p></div><Calendar className="w-8 h-8 text-secondary" /></div></Card>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-6 border-yellow-200 bg-yellow-50"><p className="text-sm text-yellow-800">Pending Properties</p><p className="text-3xl font-bold mt-1 text-yellow-900">{stats?.pending_properties || 0}</p></Card>
                <Card className="p-6 border-yellow-200 bg-yellow-50"><p className="text-sm text-yellow-800">Pending Verifications</p><p className="text-3xl font-bold mt-1 text-yellow-900">{stats?.pending_verifications || 0}</p></Card>
                <Card className="p-6 border-green-200 bg-green-50"><p className="text-sm text-green-800">Approved Properties</p><p className="text-3xl font-bold mt-1 text-green-900">{stats?.approved_properties || 0}</p></Card>
                <Card className="p-6 border-blue-200 bg-blue-50"><p className="text-sm text-blue-800">Completed Inspections</p><p className="text-3xl font-bold mt-1 text-blue-900">{stats?.completed_inspections || 0}</p></Card>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Coins className="w-6 h-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Token Revenue</p><p className="text-2xl font-bold">{formatPrice(stats?.token_revenue || 0)}</p></div></div></Card>
                <Card className="p-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center"><Calendar className="w-6 h-6 text-secondary" /></div><div><p className="text-sm text-muted-foreground">Inspection Revenue</p><p className="text-2xl font-bold">{formatPrice(stats?.inspection_revenue || 0)}</p></div></div></Card>
                <Card className="p-6 bg-primary text-primary-foreground"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div><div><p className="text-sm opacity-80">Total Revenue</p><p className="text-2xl font-bold">{formatPrice(stats?.total_revenue || 0)}</p></div></div></Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(value) => handleUpdateRole(u.id, value)}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="agent">Agent</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Badge variant={u.suspended ? 'destructive' : 'outline'}>{u.suspended ? 'Suspended' : 'Active'}</Badge></TableCell>
                      <TableCell><Button variant={u.suspended ? 'outline' : 'destructive'} size="sm" onClick={() => handleSuspendUser(u.id, !u.suspended)}><Ban className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <div className="space-y-4">
            {verifications.filter(v => v.status === 'pending').length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-4 text-yellow-800">Pending Verifications</h3>
                <div className="space-y-4">
                  {verifications.filter(v => v.status === 'pending').map((v) => (
                    <Card key={v.id} className="p-4 border-yellow-200">
                      <div className="flex items-start justify-between">
                        <div><h4 className="font-semibold">{v.user_name}</h4><p className="text-sm text-muted-foreground">{v.user_email}</p><p className="text-sm text-muted-foreground mt-1">Address: {v.address}</p></div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedVerification(v)}><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" onClick={() => handleReviewVerification(v.id, 'approved')}><CheckCircle2 className="w-4 h-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReviewVerification(v.id, 'rejected')}><XCircle className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            <h3 className="font-semibold mb-4">All Verification Requests</h3>
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Address</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>{verifications.map((v) => (<TableRow key={v.id}><TableCell><div><p className="font-medium">{v.user_name}</p><p className="text-sm text-muted-foreground">{v.user_email}</p></div></TableCell><TableCell>{v.address}</TableCell><TableCell><Badge className={getStatusBadge(v.status)}>{v.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</TableCell></TableRow>))}</TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="properties">
          <div className="space-y-4">
            {properties.filter(p => p.status === 'pending').length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-4 text-yellow-800">Pending Approval</h3>
                <div className="space-y-4">
                  {properties.filter(p => p.status === 'pending').map((p) => (
                    <Card key={p.id} className="p-4 border-yellow-200">
                      <div className="flex gap-4">
                        <img src={p.images?.[0] || 'https://images.pexels.com/photos/3754595/pexels-photo-3754595.jpeg'} alt="" className="w-32 h-24 rounded-lg object-cover" />
                        <div className="flex-1"><h4 className="font-semibold">{p.title}</h4><p className="text-sm text-muted-foreground">{p.location}</p><p className="text-primary font-bold">{formatPrice(p.price)}/year</p><p className="text-sm text-muted-foreground">By: {p.uploaded_by_agent_name}</p></div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => handleApproveProperty(p.id, 'approved')}><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleApproveProperty(p.id, 'rejected')}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            <h3 className="font-semibold mb-4">All Properties</h3>
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Type</TableHead><TableHead>Price</TableHead><TableHead>Agent</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {properties.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell><div className="flex items-center gap-3"><img src={p.images?.[0] || 'https://images.pexels.com/photos/3754595/pexels-photo-3754595.jpeg'} alt="" className="w-12 h-12 rounded object-cover" /><div><p className="font-medium">{p.title}</p><p className="text-sm text-muted-foreground">{p.location}</p></div></div></TableCell>
                      <TableCell className="capitalize">{p.property_type}</TableCell>
                      <TableCell>{formatPrice(p.price)}</TableCell>
                      <TableCell>{p.uploaded_by_agent_name}</TableCell>
                      <TableCell><Badge className={getStatusBadge(p.status)}>{p.status}</Badge></TableCell>
                      <TableCell><Button variant="destructive" size="sm" onClick={() => handleDeleteProperty(p.id)}><XCircle className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inspections">
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>User</TableHead><TableHead>Agent</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader>
              <TableBody>{inspections.map((i) => (<TableRow key={i.id}><TableCell className="font-medium">{i.property_title}</TableCell><TableCell>{i.user_name}</TableCell><TableCell>{i.agent_name || 'Unassigned'}</TableCell><TableCell>{i.inspection_date}</TableCell><TableCell><Badge className={getStatusBadge(i.status)}>{i.status}</Badge></TableCell><TableCell><Badge className={getStatusBadge(i.payment_status)}>{i.payment_status}</Badge></TableCell></TableRow>))}</TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Token Transactions</h3>
              <Card className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Tokens</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>{transactions.token_transactions.map((tx) => (<TableRow key={tx.id}><TableCell className="font-mono text-sm">{tx.reference}</TableCell><TableCell>{tx.tokens_added}</TableCell><TableCell>{formatPrice(tx.amount)}</TableCell><TableCell><Badge className={getStatusBadge(tx.status)}>{tx.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</TableCell></TableRow>))}</TableBody>
                </Table>
              </Card>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Inspection Transactions</h3>
              <Card className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>{transactions.inspection_transactions.map((tx) => (<TableRow key={tx.id}><TableCell className="font-mono text-sm">{tx.reference}</TableCell><TableCell>{formatPrice(tx.amount)}</TableCell><TableCell><Badge className={getStatusBadge(tx.status)}>{tx.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</TableCell></TableRow>))}</TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verification Request</DialogTitle><DialogDescription>Review the agent verification documents</DialogDescription></DialogHeader>
          {selectedVerification && (
            <div className="space-y-4">
              <div><p className="text-sm text-muted-foreground">User</p><p className="font-medium">{selectedVerification.user_name}</p><p className="text-sm">{selectedVerification.user_email}</p></div>
              <div><p className="text-sm text-muted-foreground">Address</p><p>{selectedVerification.address}</p></div>
              <div><p className="text-sm text-muted-foreground mb-2">ID Card</p><img src={selectedVerification.id_card_url} alt="ID Card" className="w-full max-h-48 object-contain rounded-lg border" /></div>
              <div><p className="text-sm text-muted-foreground mb-2">Selfie</p><img src={selectedVerification.selfie_url} alt="Selfie" className="w-full max-h-48 object-contain rounded-lg border" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setSelectedVerification(null)}>Close</Button><Button onClick={() => handleReviewVerification(selectedVerification.id, 'approved')}>Approve</Button><Button variant="destructive" onClick={() => handleReviewVerification(selectedVerification.id, 'rejected')}>Reject</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminDashboard;
