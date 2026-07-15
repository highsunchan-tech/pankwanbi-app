// Netlify Function: Firebase REST API Gateway
const fetch = require('node-fetch');

const PROJECT_ID = 'dash-2132d';
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCuvVMvhLE9i8sIEyRc0GR9m18RFQdDHpQ';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Firestore REST API 응답을 정규화하는 함수
function normalizeDocument(doc) {
  if (!doc || !doc.fields) return null;

  const result = {
    id: doc.name.split('/').pop(),
  };

  Object.entries(doc.fields).forEach(([key, value]) => {
    if (value.stringValue) result[key] = value.stringValue;
    else if (value.integerValue) result[key] = parseInt(value.integerValue);
    else if (value.mapValue) result[key] = normalizeMapValue(value.mapValue);
    else if (value.arrayValue) result[key] = normalizeArrayValue(value.arrayValue);
  });

  return result;
}

function normalizeMapValue(mapValue) {
  const result = {};
  if (mapValue.fields) {
    Object.entries(mapValue.fields).forEach(([key, value]) => {
      if (value.stringValue) result[key] = value.stringValue;
      else if (value.integerValue) result[key] = parseInt(value.integerValue);
      else if (value.arrayValue) result[key] = normalizeArrayValue(value.arrayValue);
      else if (value.mapValue) result[key] = normalizeMapValue(value.mapValue);
    });
  }
  return result;
}

function normalizeArrayValue(arrayValue) {
  return (arrayValue.values || []).map(v => {
    if (v.stringValue) return v.stringValue;
    if (v.integerValue) return parseInt(v.integerValue);
    if (v.mapValue) return normalizeMapValue(v.mapValue);
    return v;
  });
}

// OPTIONS 요청 처리
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const { path, method } = event;

    // 1. 전체 계정 조회
    if (path === '/api/accounts' && method === 'GET') {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accounts?key=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      const accounts = (data.documents || []).map(doc => normalizeDocument(doc));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(accounts)
      };
    }

    // 2. 특정 계정 조회
    if (path.match(/^\/api\/accounts\//) && method === 'GET') {
      const code = path.split('/')[3];
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accounts/${code}?key=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }

      const doc = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(normalizeDocument(doc))
      };
    }

    // 3. 부서 조회
    if (path === '/api/departments' && method === 'GET') {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/departments?key=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      const departments = (data.documents || []).map(doc => normalizeDocument(doc));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(departments)
      };
    }

    // 4. 메타데이터
    if (path === '/api/metadata' && method === 'GET') {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/metadata/system?key=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }

      const doc = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(normalizeDocument(doc))
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
