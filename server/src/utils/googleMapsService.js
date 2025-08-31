const axios = require('axios');

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  async getPlaceDetails(placeId) {
    try {
      const response = await axios.get(`${this.baseUrl}/place/details/json`, {
        params: {
          place_id: placeId,
          key: this.apiKey,
          fields: 'name,formatted_address,geometry,place_id,rating'
        }
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error fetching place details:', error);
      throw error;
    }
  }

  async reverseGeocode(lat, lng) {
    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey
        }
      });
      
      return response.data.results[0];
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  async searchNearbyPlaces(lat, lng, type = 'restaurant', radius = 1000) {
    try {
      const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, {
        params: {
          location: `${lat},${lng}`,
          radius,
          type,
          key: this.apiKey
        }
      });
      
      return response.data.results;
    } catch (error) {
      console.error('Error searching nearby places:', error);
      throw error;
    }
  }

  async textSearch(query, radius = 1000) {
    try {
      const response = await axios.get(`${this.baseUrl}/place/textsearch/json`, {
        params: {
          query,
          radius,
          key: this.apiKey
        }
      });

      return response.data.results;
    } catch (error) {
      console.error('Error performing text search:', error);
      throw error;
    }
  }
}

module.exports = new GoogleMapsService();