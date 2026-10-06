/**
 * Place names from coordinates: GET /geo/reverse?lat=&lon= -> { state, district }.
 *
 * Uses OpenStreetMap's Nominatim, following its usage policy: an identifying
 * User-Agent, at most one request a second (queued here), and results cached,
 * so the same field is never looked up twice. Coordinates are rounded to
 * ~100 m for the cache key; a farm does not change district within that.
 * Signed-in users only: it exists to fill the farm form.
 */

import { Router } from 'express';

import { config } from '../config/env.js';
import { HttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { validate } from '../lib/validate.js';
import { authenticate } from './auth/middleware.js';

export const geoRoutes = Router();

const cache = new Map();                    // "lat,lon" -> { state, district }
const CACHE_MAX = 5000;
let queue = Promise.resolve();              // one request at a time, >= 1.1 s apart

// "Ahmedabad District", "Surat district" -> "Ahmedabad", "Surat"
const tidy = (name) => (name ? String(name).replace(/\s+district$/i, '').trim() : null);

async function lookup(lat, lon) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key);

  const run = queue.then(async () => {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lon), zoom: '10', addressdetails: '1', 'accept-language': 'en' });
    const res = await fetch(url, {
      headers: { 'User-Agent': `FarmXpert/1.0 (${config.smtp.supportEmail})` },
      signal: AbortSignal.timeout(8000),
    });
    await new Promise((r) => setTimeout(r, 1100));
    if (!res.ok) throw new HttpError(502, 'geocoder_unavailable', 'Could not look up this location right now.');
    const a = (await res.json()).address || {};
    return {
      state: a.state || null,
      district: tidy(a.state_district || a.county || a.city_district || a.city || a.town),
      country_code: a.country_code || null,
    };
  });
  queue = run.catch(() => {});
  const place = await run;
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, place);
  return place;
}

geoRoutes.get('/geo/reverse', authenticate, validate({
  query: {
    type: 'object',
    properties: { lat: { type: 'number', minimum: -90, maximum: 90 }, lon: { type: 'number', minimum: -180, maximum: 180 } },
    required: ['lat', 'lon'],
  },
}), async (req, res) => {
  try {
    res.json(await lookup(req.query.lat, req.query.lon));
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.warn({ err: err.message }, 'Reverse geocoding failed');
    throw new HttpError(502, 'geocoder_unavailable', 'Could not look up this location right now.');
  }
});
