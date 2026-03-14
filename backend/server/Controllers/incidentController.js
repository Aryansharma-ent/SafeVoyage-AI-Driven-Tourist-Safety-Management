import AsyncHandler from 'express-async-handler';
import Incident from '../Models/Incident.js';
import { buildIncidentHash } from '../utils/hashIncident.js';
import { upsertRiskZoneFromIncident } from '../utils/riskZoneEngine.js';

//@GET get all incidents
export const getIncidents = AsyncHandler(async (req, res) => {
	const incidents = await Incident.find().sort({ createdAt: -1 });
	res.status(200).json(incidents);
});

//@POST report an incident with tamper-evident hash chain
export const reportIncident = AsyncHandler(async (req, res) => {
	const { deviceId, location, description, incidentType } = req.body;

	if (!deviceId || !location || typeof location.lat !== 'number' || typeof location.lon !== 'number' || !description) {
		res.status(400);
		throw new Error('deviceId, location.lat, location.lon and description are required');
	}

	const lastIncident = await Incident.findOne().sort({ createdAt: -1 });
	const previousHash = lastIncident?.incidentHash || 'GENESIS';
	const createdAt = new Date().toISOString();

	const incidentHash = buildIncidentHash({
		deviceId,
		location,
		description,
		incidentType: incidentType || 'other',
		createdAt,
		previousHash,
	});

	const incident = await Incident.create({
		deviceId,
		location,
		description,
		incidentType,
		previousHash,
		incidentHash,
		createdAt,
	});

	let autoZone = null;
	try {
		autoZone = await upsertRiskZoneFromIncident(incident);
	} catch (zoneError) {
		console.error('Auto risk-zone update failed:', zoneError.message);
	}

	res.status(201).json({
		incident,
		autoRiskZoneId: autoZone?._id || null,
	});
});

//@GET verify hash chain integrity for all incidents
export const verifyIncidentChain = AsyncHandler(async (req, res) => {
	const incidents = await Incident.find().sort({ createdAt: 1 });

	let expectedPreviousHash = 'GENESIS';
	let isValid = true;
	const brokenAt = [];

	for (const incident of incidents) {
		const recalculatedHash = buildIncidentHash({
			deviceId: incident.deviceId,
			location: incident.location,
			description: incident.description,
			incidentType: incident.incidentType,
			createdAt: incident.createdAt.toISOString(),
			previousHash: incident.previousHash,
		});

		const linkBroken = incident.previousHash !== expectedPreviousHash;
		const hashBroken = incident.incidentHash !== recalculatedHash;

		if (linkBroken || hashBroken) {
			isValid = false;
			brokenAt.push({
				incidentId: incident._id,
				linkBroken,
				hashBroken,
			});
		}

		expectedPreviousHash = incident.incidentHash;
	}

	res.status(200).json({
		isValid,
		totalIncidents: incidents.length,
		brokenAt,
	});
});
