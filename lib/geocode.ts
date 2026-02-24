export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // You can use Google Geocoding API here
    // const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
    // const data = await response.json();
    // return data.results[0]?.formatted_address || 'Unknown location';

    // Mock address for now
    const addresses = [
      'Butwal-10, Devinagar, Nepal',
      'Tilottama, Butwal, Nepal',
      'Manigram, Butwal, Nepal',
      'Sunauli Border, Nepal',
      'Butwal Bus Park, Nepal'
    ];
    return addresses[Math.floor(Math.random() * addresses.length)];
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Unknown location';
  }
}
