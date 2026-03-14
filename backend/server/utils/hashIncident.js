import crypto from 'crypto';

const canonicalizeIncidentPayload = ({ deviceId, location, description, incidentType, createdAt, previousHash }) => {
    return JSON.stringify({
        deviceId,
        lat: location.lat,
        lon: location.lon,
        description,
        incidentType,
        createdAt,
        previousHash,
    });
};

export const buildIncidentHash = ({ deviceId, location, description, incidentType, createdAt, previousHash }) => {
    const payload = canonicalizeIncidentPayload({
        deviceId,
        location,
        description,
        incidentType,
        createdAt,
        previousHash,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
};
