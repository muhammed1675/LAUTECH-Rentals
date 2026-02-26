import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { propertyAPI, inspectionAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Building2, Plus, Calendar, Edit, Clock, CheckCircle2, XCircle, Home, Building } from 'lucide-react';
import { toast } from 'sonner';

export function AgentDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAgent, isAdmin } = useAuth();
  
  const [properties, setProperties] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', description: '', price: '', location: '',
    property_type: 'hostel', images: [], contact_name: '', contact_phone: '',
  });
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!isAgent && !isAdmin) { toast.error('Access denied'); navigate('/'); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAgent, isAdmin, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [propertiesRes, inspectionsRes] = await Promise.all([
        propertyAPI.getMyListings(user.id),
        inspectionAPI.getAssigned(user.id),
      ]);
      setProperties(propertiesRes.data);
      setInspections(inspectionsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    if (imageUrl && !formData.images.includes(imageUrl)) {
      setFormData({ ...formData, images: [...formData.images, imageUrl] });
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', location: '', property_type: 'hostel', images: [], contact_name: '', contact_phone: '' });
    setEditingProperty(null);
  };

  const handleOpenDialog = (property = null) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        title: property.title, description: property.description, price: property.price.toString(),
        location: property.location, property_type: property.property_type, images: property.images || [],
        contact_name: property.contact_name, contact_phone: property.contact_phone,
      });
    } else { resetForm(); }
    setShowPropertyDialog(true);
  };

  const handleSubmitProperty = async () => {
    if (!formData.title || !formData.price || !formData.location || !formData.contact_name || !formData.contact_phone) {
      toast.error('Please fill in all required fields'); return;
    }
    try {
      const data = {
        ...formData, price: parseInt(formData.price),
        images: formData.images.length > 0 ? formData.images : ['https://images.pexels.com/photos/3754595/pexels-photo-3754595.jpeg'],
      };
      if (editingProperty) {
        await propertyAPI.update(editingProperty.id, data);
        toast.success('Property updated');
      } else {
        await propertyAPI.create(data, user);
        toast.success('Property created');
      }
      setShowPropertyDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to save property');
    }
  };

  const handleMarkCompleted = async (inspectionId) => {
    try {
      await inspectionAPI.update(inspectionId, { status: 'completed' });
      toast.success('Inspection marked as completed');
      fetchData();
    } catch (error) {
      toast.error('Failed to update inspection');
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);
  const getStatusBadge = (status) => ({ pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', assigned: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800' }[status] || 'bg-gray-100 text-gray-800');

  if (!isAuthenticated || (!isAgent && !isAdmin)) return null;

  return (
    <div className="container mx-auto px-4 py-6" data-testid="agent-dashboard">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your properties and inspections</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2" data-testid="add-property-btn">
          <Plus className="w-4 h-4" /> Add Property
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4"><p className="text-2xl font-bold">{properties.length}</p><p className="text-sm text-muted-foreground">Total Properties</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-green-600">{properties.filter(p => p.status === 'approved').length}</p><p className="text-sm text-muted-foreground">Approved</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-yellow-600">{properties.filter(p => p.status === 'pending').length}</p><p className="text-sm text-muted-foreground">Pending</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold">{inspections.length}</p><p className="text-sm text-muted-foreground">Inspections</p></Card>
      </div>

      <Tabs defaultValue="properties">
        <TabsList className="mb-6">
          <TabsTrigger value="properties" className="gap-2"><Building2 className="w-4 h-4" /> My Properties</TabsTrigger>
          <TabsTrigger value="inspections" className="gap-2"><Calendar className="w-4 h-4" /> Assigned Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="properties">
          {loading ? <div className="space-y-4">{[1,2,3].map(i => <Card key={i} className="p-4 animate-pulse"><div className="h-24 bg-muted rounded" /></Card>)}</div> 
          : properties.length > 0 ? (
            <div className="space-y-4">
              {properties.map((property) => (
                <Card key={property.id} className="p-4">
                  <div className="flex gap-4">
                    <img src={property.images?.[0] || 'https://images.pexels.com/photos/3754595/pexels-photo-3754595.jpeg'} alt="" className="w-32 h-24 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div><h3 className="font-semibold">{property.title}</h3><p className="text-sm text-muted-foreground">{property.location}</p><p className="text-primary font-bold mt-1">{formatPrice(property.price)}/year</p></div>
                        <Badge className={getStatusBadge(property.status)}>{property.status}</Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(property)}><Edit className="w-4 h-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold">No Properties Yet</h3>
              <Button onClick={() => handleOpenDialog()} className="mt-4">Add Property</Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inspections">
          {inspections.length > 0 ? (
            <div className="space-y-4">
              {inspections.map((inspection) => (
                <Card key={inspection.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{inspection.property_title}</h3>
                      <p className="text-sm text-muted-foreground">Requested by: {inspection.user_name}</p>
                      <p className="text-sm text-muted-foreground">Date: {inspection.inspection_date}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusBadge(inspection.status)}>{inspection.status}</Badge>
                      {inspection.status !== 'completed' && inspection.payment_status === 'completed' && (
                        <Button size="sm" onClick={() => handleMarkCompleted(inspection.id)} className="gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center"><Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold">No Inspections Assigned</h3></Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showPropertyDialog} onOpenChange={setShowPropertyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Cozy Student Hostel" /></div>
              <div className="space-y-2"><Label>Property Type *</Label>
                <Select value={formData.property_type} onValueChange={(value) => setFormData({ ...formData, property_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="hostel"><Home className="w-4 h-4 inline mr-2" />Hostel</SelectItem><SelectItem value="apartment"><Building className="w-4 h-4 inline mr-2" />Apartment</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price (₦/year) *</Label><Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="120000" /></div>
              <div className="space-y-2"><Label>Location *</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Near LAUTECH Main Gate" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the property..." rows={4} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Owner Name *</Label><Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} placeholder="John Doe" /></div>
              <div className="space-y-2"><Label>Owner Phone *</Label><Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="+234..." /></div>
            </div>
            <div className="space-y-2">
              <Label>Images</Label>
              <div className="flex gap-2"><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Enter image URL" /><Button type="button" onClick={handleAddImage} variant="outline"><Plus className="w-4 h-4" /></Button></div>
              {formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      <button onClick={() => handleRemoveImage(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPropertyDialog(false)}>Cancel</Button><Button onClick={handleSubmitProperty}>{editingProperty ? 'Update' : 'Create'} Property</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgentDashboard;
