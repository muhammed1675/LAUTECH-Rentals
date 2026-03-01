import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { verificationAPI, storageAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Shield, Upload, ArrowLeft, CheckCircle2, FileText, Download, Loader2, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function BecomeAgent() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isUser } = useAuth();

  const idCardRef = useRef(null);
  const selfieRef = useRef(null);
  const agreementRef = useRef(null);

  const [idCardFile, setIdCardFile] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [agreementFile, setAgreementFile] = useState(null);
  const [address, setAddress] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleImageSelect = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleAgreementSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('PDF must be under 10MB'); return; }
    setAgreementFile(file);
    toast.success('Agreement PDF selected');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idCardFile) { toast.error('Please upload your ID card photo'); return; }
    if (!selfieFile) { toast.error('Please upload your selfie with ID'); return; }
    if (!agreementFile) { toast.error('Please upload the signed agreement PDF'); return; }
    if (!address.trim()) { toast.error('Please enter your address'); return; }

    setUploading(true);
    try {
      toast.loading('Uploading documents...', { id: 'upload' });

      const [idCardResult, selfieResult, agreementResult] = await Promise.all([
        storageAPI.uploadFile(idCardFile, 'verification/id-cards'),
        storageAPI.uploadFile(selfieFile, 'verification/selfies'),
        storageAPI.uploadFile(agreementFile, 'verification/agreements'),
      ]);

      toast.dismiss('upload');
      setUploading(false);
      setLoading(true);

      await verificationAPI.request({
        id_card_url: idCardResult.data.url,
        selfie_url: selfieResult.data.url,
        agreement_url: agreementResult.data.url,
        address,
      }, user);

      toast.success('Verification request submitted!');
      setSubmitted(true);
    } catch (error) {
      toast.dismiss('upload');
      toast.error(error.message || 'Failed to submit. Please try again.');
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  if (!isAuthenticated) { navigate('/login'); return null; }
  if (!isUser) { navigate('/'); return null; }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Request Submitted!</h1>
            <p className="text-foreground/60 mb-6">
              Your agent verification request has been submitted. Our admin team will review your documents and get back to you soon.
            </p>
            <Button onClick={() => navigate('/profile')}>Back to Profile</Button>
          </Card>
        </div>
      </div>
    );
  }

  const isLoading = uploading || loading;

  return (
    <div className="container mx-auto px-4 py-6" data-testid="become-agent-page">
      <Button variant="ghost" onClick={() => navigate('/profile')} className="mb-4 gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Button>

      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Become an Agent</h1>
          <p className="text-foreground/60 mt-2">Submit your verification documents to become a property agent</p>
        </div>

        {/* Step 1 — Download Agreement */}
        <Card className="p-5 mb-4 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 text-white font-bold text-sm">1</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Download & Sign Agreement</h3>
              <p className="text-sm text-foreground/60 mt-1 mb-3">
                Download the agent agreement, read it carefully, sign it (handwritten or digital), and then upload the signed copy below.
              </p>
              <a
                href="/agent-agreement.pdf"
                download="Rentora-Agent-Agreement.pdf"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Agent Agreement PDF
              </a>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ID Card Upload */}
            <div className="space-y-2">
              <Label>ID Card Photo <span className="text-destructive">*</span></Label>
              <p className="text-xs text-foreground/55">National ID, Voter's card, Driver's license, or International passport</p>
              <input ref={idCardRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleImageSelect(e, setIdCardFile, setIdCardPreview)} />
              {idCardPreview ? (
                <div className="relative group">
                  <img src={idCardPreview} alt="ID Card" className="w-full max-h-44 object-contain rounded-lg border bg-muted/30" />
                  <button type="button" onClick={() => { setIdCardFile(null); setIdCardPreview(null); if (idCardRef.current) idCardRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {idCardFile?.name}
                  </p>
                </div>
              ) : (
                <div onClick={() => idCardRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/20 transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to upload ID card</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
                </div>
              )}
            </div>

            {/* Selfie Upload */}
            <div className="space-y-2">
              <Label>Selfie Holding ID Card <span className="text-destructive">*</span></Label>
              <p className="text-xs text-foreground/55">A clear photo of you holding your ID card so your face and ID are both visible</p>
              <input ref={selfieRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleImageSelect(e, setSelfieFile, setSelfiePreview)} />
              {selfiePreview ? (
                <div className="relative group">
                  <img src={selfiePreview} alt="Selfie" className="w-full max-h-44 object-contain rounded-lg border bg-muted/30" />
                  <button type="button" onClick={() => { setSelfieFile(null); setSelfiePreview(null); if (selfieRef.current) selfieRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {selfieFile?.name}
                  </p>
                </div>
              ) : (
                <div onClick={() => selfieRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/20 transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to upload selfie with ID</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
                </div>
              )}
            </div>

            {/* Signed Agreement Upload */}
            <div className="space-y-2">
              <Label>Signed Agreement PDF <span className="text-destructive">*</span></Label>
              <p className="text-xs text-foreground/55">Upload the signed agreement you downloaded in Step 1</p>
              <input ref={agreementRef} type="file" accept="application/pdf" className="hidden" onChange={handleAgreementSelect} />
              {agreementFile ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200">
                  <FileText className="w-8 h-8 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 truncate">{agreementFile.name}</p>
                    <p className="text-xs text-green-600">{(agreementFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={() => { setAgreementFile(null); if (agreementRef.current) agreementRef.current.value = ''; }}
                    className="w-7 h-7 bg-destructive text-white rounded-full flex items-center justify-center shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div onClick={() => agreementRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/20 transition-colors">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to upload signed PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF only, up to 10MB</p>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Home Address <span className="text-destructive">*</span></Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Your full address in Ogbomosho..." rows={3} data-testid="address-input" />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12" data-testid="submit-verification-btn">
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading documents...</>
              ) : loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting request...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Submit Verification Request</>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-foreground/55 mt-4">
          Once approved, you'll be able to list properties and manage inspections.
        </p>
      </div>
    </div>
  );
}

export default BecomeAgent;
