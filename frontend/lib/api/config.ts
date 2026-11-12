// Where the frontend server reaches the backend (inside Docker: the backend
// service on the private network). The browser never uses this address.
export function backendUrl() {
  return (process.env.BACKEND_URL?.trim() || 'http://localhost:4000').replace(/\/$/, '');
}
