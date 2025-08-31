const googleMapsService = require('../utils/googleMapsService');

module.exports = {
  searchNearby: async (req, res, next) => {
    try {
      const { lat, lng, radius, type, query } = req.query;
      let results = [];
      if (query) {
        // text search across places
        results = await googleMapsService.textSearch(query, parseInt(radius, 10) || 1000);
      } else {
        if (!lat || !lng) return res.status(400).json({ status: 'error', message: 'lat and lng are required when query is not provided' });
        results = await googleMapsService.searchNearbyPlaces(parseFloat(lat), parseFloat(lng), type || 'restaurant', parseInt(radius, 10) || 1000);
      }
      res.status(200).json({ status: 'success', data: results });
    } catch (err) {
      console.error('Maps search error:', err);
      next(err);
    }
  }
};
