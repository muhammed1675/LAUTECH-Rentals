import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { verificationAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Shield, Upload, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function BecomeAgent() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isUser } = useAuth();
  
  const [idCardUrl, setIdCardUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!idCardUrl || !selfieUrl || !address) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await verificationAPI.request({
        id_card_url: idCardUrl,
        selfie_url: selfieUrl,
        address,
      }, user);
      toast.success('Verification request submitted!');
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  if (!isUser) {
    navigate('/');
    return null;
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Request Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Your agent verification request has been submitted. Our admin team will review your documents and get back to you soon.
            </p>
            <Button onClick={() => navigate('/profile')}>
              Back to Profile
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6" data-testid="become-agent-page">
      <Button
        variant="ghost"
        onClick={() => navigate('/profile')}
        className="mb-4 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </Button>

      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Become an Agent</h1>
          <p className="text-muted-foreground mt-2">
            Submit your verification documents to become a property agent
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>ID Card Image URL</Label>
              <Input
                value={idCardUrl}
                onChange={(e) => setIdCardUrl(e.target.value)}
                placeholder="https://example.com/id-card.jpg"
                data-testid="id-card-url"
              />
              <p className="text-xs text-muted-foreground">
                Upload your ID card image to a service like Imgur and paste the URL here
              </p>
              {idCardUrl && (
                <img
                  src={idCardUrl}
                  alt="ID Card Preview"
                  className="w-full max-h-40 object-contain rounded-lg border mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Selfie Image URL</Label>
              <Input
                value={selfieUrl}
                onChange={(e) => setSelfieUrl(e.target.value)}
                placeholder="https://example.com/selfie.jpg"
                data-testid="selfie-url"
              />
              <p className="text-xs text-muted-foreground">
                A clear selfie holding your ID card
              </p>
              {selfieUrl && (
                <img
                  src={selfieUrl}
                  alt="Selfie Preview"
                  className="w-full max-h-40 object-contain rounded-lg border mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your full address in Ogbomosho..."
                rows={3}
                data-testid="address-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12"
              data-testid="submit-verification-btn"
            >
              {loading ? 'Submitting...' : 'Submit Verification Request'}
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Once approved, you'll be able to list properties and manage inspections.</p>
        </div>
      </div>
    </div>
  );
}

export default BecomeAgent;
