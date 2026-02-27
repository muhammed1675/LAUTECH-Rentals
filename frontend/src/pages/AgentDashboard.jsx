import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { propertyAPI, inspectionAPI, storageAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Building2, Plus, Calendar, Edit, CheckCircle2, XCircle, Home, Building, Upload, Image, Loader2, Expand, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

// ── Lightbox ────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10">
        <X className="w-5 h-5" />
      </button>
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full">
          {current + 1} / {images.length}
        </div>
      )}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <img src={images[current]} alt={`Property image ${current + 1}`} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((img, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${i === current ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-100'}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function AgentDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAgent, isAdmin } = useAuth();
  const fileInputRef = useRef(null);

  const [properties, setProperties] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });

  const [formData, setFormData] = useState({
    title: '', description: '', price: '', location: '',
    property_type: 'hostel', images: [], contact_name: '', contact_phone: '',
  });

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!isAgent && !isAdmin) { toast.error('Access denied'); navigate('/'); return; }
    fetchData();
  }, [isAuthenticated, isAgent, isAdmin, user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openLightbox = (images, index = 0) => setLightbox({ open: true, images, index });
  const closeLightbox = () => setLightbox({ open: false, images: [], index: 0 });

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (formData.images.length + files.length > 5) { toast.error('Maximum 5 images allowed'); return; }
    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image`); continue; }
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} is too large. Max 5MB`); continue; }
        const result = await storageAPI.uploadImage(file, 'property-images');
        uploadedUrls.push(result.data.url);
      }
      if (uploadedUrls.length > 0) {
        setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
        toast.success(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded`);
      }
    } catch (error) {
      toast.error('Failed to upload image. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

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
      const data = { ...formData, price: parseInt(formData.price), images: formData.images };
      if (editingProperty) {
        await propertyAPI.update(editingProperty.id, data);
        toast.success('Property updated — pending admin re-approval');
      } else {
        await propertyAPI.create(data, user);
        toast.success('Property submitted for approval');
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
  const getStatusBadge = (status) => ({
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    assigned: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800'
  }[status] || 'bg-gray-100 text-gray-800');

  if (!isAuthenticated || (!isAgent && !isAdmin)) return null;

  return (
    <div className="container mx-auto px-4 py-6" data-testid="agent-dashboard">
      {lightbox.open && <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={closeLightbox} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your properties and inspections</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2" data-testid="add-property-btn">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Property</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4"><p className="text-2xl font-bold">{properties.length}</p><p className="text-sm text-muted-foreground">Total Properties</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-green-600">{properties.filter(p => p.status === 'approved').length}</p><p className="text-sm text-muted-foreground">Approved</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-yellow-600">{properties.filter(p => p.status === 'pending').length}</p><p className="text-sm text-muted-foreground">Pending</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold">{inspections.length}</p><p className="text-sm text-muted-foreground">Inspections</p></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="properties">
        <TabsList className="mb-5">
          <TabsTrigger value="properties" className="gap-2"><Building2 className="w-4 h-4" /> My Properties</TabsTrigger>
          <TabsTrigger value="inspections" className="gap-2"><Calendar className="w-4 h-4" /> Assigned Inspections</TabsTrigger>
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <Card key={i} className="overflow-hidden">
                  <div className="flex" style={{ height: '110px' }}>
                    <div className="w-28 bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 p-3 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                      <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="space-y-3">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden">
                  <div className="flex">

                    {/* Left: image — fixed width, fills height naturally */}
                    <div className="relative group flex-shrink-0 w-28 sm:w-32" style={{ minHeight: '110px' }}>
                      {property.images?.[0] ? (
                        <>
                          <img
                            src={property.images[0]}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                            onClick={() => openLightbox(property.images, 0)}
                          />
                          {/* Hover overlay */}
                          <div
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-end justify-center pb-2 transition-all cursor-pointer"
                            onClick={() => openLightbox(property.images, 0)}
                          >
                            <span className="text-white text-xs font-medium bg-black/60 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <Expand className="w-3 h-3" /> View
                            </span>
                          </div>
                          {/* Extra images count */}
                          {property.images.length > 1 && (
                            <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-medium pointer-events-none">
                              +{property.images.length - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <Image className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Right: content — 3-row flex column */}
                    <div className="flex-1 p-3 min-w-0 flex flex-col justify-between" style={{ minHeight: '110px' }}>

                      {/* Row 1: title + status badge */}
                      <div className="flex items-start gap-2">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1 min-w-0">
                          {property.title}
                        </h3>
                        <Badge className={`${getStatusBadge(property.status)} text-xs capitalize shrink-0 whitespace-nowrap`}>
                          {property.status}
                        </Badge>
                      </div>

                      {/* Row 2: location */}
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {property.location}
                      </p>

                      {/* Row 3: price + edit button — always on same line, never wraps */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-primary font-bold text-sm truncate">
                          {formatPrice(property.price)}
                          <span className="text-xs font-normal text-muted-foreground">/yr</span>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(property)}
                          className="h-7 px-2.5 text-xs gap-1 shrink-0"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </Button>
                      </div>

                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold">No Properties Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first property listing to get started</p>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" /> Add Property
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections">
          {inspections.length > 0 ? (
            <div className="space-y-3">
              {inspections.map((inspection) => (
                <Card key={inspection.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold line-clamp-1">{inspection.property_title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">By: {inspection.user_name}</p>
                      <p className="text-sm text-muted-foreground">Date: {inspection.inspection_date}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={getStatusBadge(inspection.status)}>{inspection.status}</Badge>
                      {inspection.status !== 'completed' && inspection.payment_status === 'completed' && (
                        <Button size="sm" onClick={() => handleMarkCompleted(inspection.id)} className="gap-1.5 h-7 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold">No Inspections Assigned</h3>
              <p className="text-sm text-muted-foreground mt-1">Inspections assigned to you will appear here</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Property Dialog */}
      <Dialog open={showPropertyDialog} onOpenChange={setShowPropertyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
            <DialogDescription>Fill in the details below to {editingProperty ? 'update your' : 'list a new'} property.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Cozy Student Hostel" /></div>
              <div className="space-y-2"><Label>Property Type *</Label>
                <Select value={formData.property_type} onValueChange={(value) => setFormData({ ...formData, property_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hostel"><Home className="w-4 h-4 inline mr-2" />Hostel</SelectItem>
                    <SelectItem value="apartment"><Building className="w-4 h-4 inline mr-2" />Apartment</SelectItem>
                  </SelectContent>
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

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Property Images <span className="text-muted-foreground text-xs font-normal">(max 5, up to 5MB each)</span></Label>
              <div
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${uploadingImage ? 'opacity-50 cursor-not-allowed border-muted' : 'border-muted-foreground/25 hover:border-primary hover:bg-muted/30'}`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload images</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WEBP supported</p>
                  </div>
                )}
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={img} alt={`Property ${index + 1}`} className="w-full h-full rounded-lg object-cover cursor-pointer" onClick={() => openLightbox(formData.images, index)} />
                      <button type="button" onClick={() => openLightbox(formData.images, index)}
                        className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Expand className="w-3 h-3" /> View
                      </button>
                      <button type="button" onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                      {index === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1 rounded pointer-events-none">Cover</span>}
                    </div>
                  ))}
                  {formData.images.length < 5 && (
                    <div onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPropertyDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmitProperty} disabled={uploadingImage}>
              {uploadingImage ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <>{editingProperty ? 'Update' : 'Create'} Property</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgentDashboard;
