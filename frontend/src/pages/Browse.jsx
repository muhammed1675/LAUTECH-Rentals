import { useState, useEffect } from 'react';
import { propertyAPI } from '../lib/api';
import { PropertyCard, PropertyCardSkeleton } from '../components/PropertyCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Card } from '../components/ui/card';
import { Search, SlidersHorizontal, X, Home, Building, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function Browse() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [propertyType, setPropertyType] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = { status: 'approved' };
      if (propertyType && propertyType !== 'all') {
        params.property_type = propertyType;
      }
      if (priceRange[0] > 0) {
        params.min_price = priceRange[0];
      }
      if (priceRange[1] < 500000) {
        params.max_price = priceRange[1];
      }
      
      const response = await propertyAPI.getAll(params);
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    fetchProperties();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setPropertyType('all');
    setPriceRange([0, 500000]);
    setSearchTerm('');
    fetchProperties();
  };

  const filteredProperties = properties.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.location.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-6" data-testid="browse-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Browse Properties</h1>
        <p className="text-muted-foreground mt-1">
          Find verified hostels and apartments near LAUTECH
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by title, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 bg-muted/50"
            data-testid="search-input"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="h-12 gap-2"
          data-testid="filter-toggle"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filters
        </Button>
        <Button
          variant="ghost"
          onClick={fetchProperties}
          className="h-12"
          data-testid="refresh-btn"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Property Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Property Type</label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger data-testid="type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hostel">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Hostel
                    </div>
                  </SelectItem>
                  <SelectItem value="apartment">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Apartment
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Price Range (per year)</label>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                </span>
              </div>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={0}
                max={500000}
                step={10000}
                className="py-2"
                data-testid="price-slider"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleApplyFilters} className="flex-1" data-testid="apply-filters">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleResetFilters} data-testid="reset-filters">
              Reset
            </Button>
          </div>
        </Card>
      )}

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-4">
        {loading ? 'Loading...' : `${filteredProperties.length} properties found`}
      </p>

      {/* Properties Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProperties.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No Properties Found</h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your filters or search term
          </p>
          <Button variant="outline" onClick={handleResetFilters} className="mt-4">
            Reset Filters
          </Button>
        </Card>
      )}
    </div>
  );
}

export default Browse;
