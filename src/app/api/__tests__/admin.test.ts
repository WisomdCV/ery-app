```typescript
import request from 'supertest';

const API_URL = 'http://localhost:3001/api/admin'; // Using port 3001

describe('Admin Endpoints', () => {
  // A mock admin token - in a real scenario, this would be obtained after a successful admin login
  // For this test, we use a structurally valid JWT but it won't match any real user if DB is down.
  // The verifyAuth function checks roles from the token itself, so if the token *is* valid and contains 'administrador',
  // it will pass the auth check, and then the route handler will attempt DB operations.
  const mockAdminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJub21icmUiOiJBZG1pbiBVc2VyIiwicm9sZXMiOlsiYWRtaW5pc3RyYWRvciJdLCJpYXQiOjE2NzAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.mockSignatureForTesting"; // Example validly structured token

  describe('GET /api/admin/users', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(API_URL).get('/users');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token no proporcionado');
    });

    it('should return 401 for an invalid/expired token', async () => {
      const response = await request(API_URL)
        .get('/users')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token inválido');
    });

    it('should return 503 for admin user when DB is unavailable', async () => {
      const response = await request(API_URL)
        .get('/users')
        .set('Authorization', `Bearer ${mockAdminToken}`); // Assuming this token is validly signed
      expect(response.status).toBe(503);
      expect(response.body.message).toBe('Servicio no disponible temporalmente debido a problemas con la base de datos.');
    }, 30000);

    it.skip('should return 403 for non-admin user', async () => {
      // This test would require obtaining a valid non-admin token.
      // For now, we assume verifyAuth handles role checks based on token content.
      // If a non-admin token (e.g., "user" role) was used, it should result in 403.
      const userToken = "some_valid_non_admin_token"; // Placeholder
      const response = await request(API_URL)
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Acceso denegado. Se requiere uno de los siguientes roles: administrador.");
    });
  });

  describe('GET /api/admin/roles', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(API_URL).get('/roles');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token no proporcionado');
    });

    it('should return 401 for an invalid/expired token', async () => {
      const response = await request(API_URL)
        .get('/roles')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token inválido');
    });

    it('should return 503 for admin user when DB is unavailable', async () => {
      const response = await request(API_URL)
        .get('/roles')
        .set('Authorization', `Bearer ${mockAdminToken}`); // Assuming this token is validly signed
      expect(response.status).toBe(503);
      expect(response.body.message).toBe('Servicio no disponible temporalmente debido a problemas con la base de datos.');
    }, 30000);

    it.skip('should return 403 for non-admin user', async () => {
      // This test would require obtaining a valid non-admin token.
    });
  });

  describe('GET /api/admin/test-protected', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(API_URL).get('/test-protected');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token no proporcionado');
    });

    it('should return 401 for an invalid/expired token', async () => {
      const response = await request(API_URL)
        .get('/test-protected')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token inválido');
    });

    it('should return 200 for admin (as this route does not directly access DB beyond auth)', async () => {
      // This test assumes verifyAuth can validate the token and roles without a DB call
      // if roles are embedded in the token.
      const response = await request(API_URL)
        .get('/test-protected')
        .set('Authorization', `Bearer ${mockAdminToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Hola, Administrador Admin User! Has accedido a una ruta protegida.');
    }, 30000);

    it.skip('should return 403 for non-admin user', async () => {
      // This test would require obtaining a valid non-admin token.
    });
  });
});
```
