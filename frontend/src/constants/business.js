export const BUSINESS_TYPES = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'CAB_DRIVER', label: 'Cab Driver' },
  { value: 'TOURIST_GUIDE_SERVICE', label: 'Tourist Guide / Service' },
];

export const GUIDE_SERVICE_OPTIONS = [
  'Adventure Sports',
  'Water Sports',
  'City Tours',
  'Heritage Walks',
  'Nature Trails',
  'Pilgrimage Tours',
  'Food Tours',
  'Photography Tours',
];

export function createEmptyBusinessForm() {
  return {
    businessType: 'HOTEL',
    businessName: '',
    phone: '',
    city: '',
    address: '',
    description: '',
    totalRooms: '',
    amenities: '',
    hotelImages: [],
    restaurantImages: [],
    cuisine: '',
    openingHours: '',
    seatingCapacity: '',
    driverName: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    serviceArea: '',
    guideName: '',
    personalBio: '',
    yearsExperience: '',
    languages: '',
    serviceCategories: [],
    certifications: '',
  };
}

export function buildBusinessProfilePayload(form) {
  const payload = {
    business_type: form.businessType,
    business_name: form.businessName?.trim() || '',
    phone: form.phone?.trim() || '',
    city: form.city?.trim() || '',
    address: form.address?.trim() || '',
    description: form.description?.trim() || '',
  };

  if (form.businessType === 'HOTEL') {
    payload.total_rooms = form.totalRooms;
    payload.amenities = (form.amenities || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    payload.image_urls = form.hotelImages || [];
  } else if (form.businessType === 'RESTAURANT') {
    payload.cuisine = form.cuisine?.trim() || '';
    payload.opening_hours = form.openingHours?.trim() || '';
    payload.image_urls = form.restaurantImages || [];
    payload.seating_capacity = form.seatingCapacity;
  } else if (form.businessType === 'CAB_DRIVER') {
    payload.driver_name = form.driverName?.trim() || '';
    payload.vehicle_type = form.vehicleType?.trim() || '';
    payload.vehicle_number = form.vehicleNumber?.trim() || '';
    payload.license_number = form.licenseNumber?.trim() || '';
    payload.service_area = form.serviceArea?.trim() || '';
  } else if (form.businessType === 'TOURIST_GUIDE_SERVICE') {
    payload.guide_name = form.guideName?.trim() || '';
    payload.personal_bio = form.personalBio?.trim() || '';
    payload.years_experience = form.yearsExperience;
    payload.languages = (form.languages || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    payload.service_categories = form.serviceCategories || [];
    payload.certifications = form.certifications?.trim() || '';
  }

  return payload;
}

export function businessProfileToForm(profile) {
  if (!profile || typeof profile !== 'object') {
    return createEmptyBusinessForm();
  }

  const details = profile.details || {};
  const businessType = profile.business_type || 'HOTEL';

  return {
    businessType,
    businessName: profile.business_name || '',
    phone: profile.phone || '',
    city: profile.city || '',
    address: profile.address || '',
    description: profile.description || '',
    totalRooms: details.total_rooms?.toString() || '',
    amenities: (details.amenities || []).join(', '),
    hotelImages: details.image_urls || [],
    restaurantImages: details.image_urls || [],
    cuisine: details.cuisine || '',
    openingHours: details.opening_hours || '',
    seatingCapacity: details.seating_capacity?.toString() || '',
    driverName: details.driver_name || '',
    vehicleType: details.vehicle_type || '',
    vehicleNumber: details.vehicle_number || '',
    licenseNumber: details.license_number || '',
    serviceArea: details.service_area || '',
    guideName: details.guide_name || '',
    personalBio: details.personal_bio || '',
    yearsExperience: details.years_experience?.toString() || '',
    languages: (details.languages || []).join(', '),
    serviceCategories: details.service_categories || [],
    certifications: details.certifications || '',
  };
}
