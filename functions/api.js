// Netlify Function: Firebase API Gateway
const admin = require('firebase-admin');

// Firebase 초기화
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// 헬퍼 함수: CORS 헤더
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// OPTIONS 요청 처리
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const { path, method, body } = event;

    // 1. 전체 계정 조회
    if (path === '/api/accounts' && method === 'GET') {
      const snapshot = await db.collection('accounts').limit(100).get();
      const accounts = [];
      snapshot.forEach(doc => {
        accounts.push({ id: doc.id, ...doc.data() });
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(accounts)
      };
    }

    // 2. 특정 계정 조회
    if (path.match(/^\/api\/accounts\//) && method === 'GET') {
      const code = path.split('/')[3];
      const doc = await db.collection('accounts').doc(code).get();
      if (!doc.exists) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ id: doc.id, ...doc.data() })
      };
    }

    // 3. 부서 조회
    if (path === '/api/departments' && method === 'GET') {
      const snapshot = await db.collection('departments').get();
      const departments = [];
      snapshot.forEach(doc => {
        departments.push({ id: doc.id, ...doc.data() });
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(departments)
      };
    }

    // 4. 검색
    if (path === '/api/search' && method === 'GET') {
      const query = event.queryStringParameters?.q || '';
      const snapshot = await db.collection('accounts')
        .where('name', '>=', query)
        .where('name', '<=', query + '')
        .limit(20)
        .get();

      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results)
      };
    }

    // 5. 메타데이터
    if (path === '/api/metadata' && method === 'GET') {
      const doc = await db.collection('metadata').doc('system').get();
      if (!doc.exists) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(doc.data())
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
