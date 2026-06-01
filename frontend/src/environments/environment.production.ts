export const environment = {
  production: true,
  apiUrl: '/api/v1',
  // Buit = mateix origen que la pàgina. Així el frontend connecta amb el socket
  // del seu propi domini (l'Ingress enruta /socket.io/), i la imatge funciona a
  // qualsevol desplegament sense recompilar (grup4, grupdemo3, etc.).
  socketUrl: '',
  piecesCdn: 'https://lichess1.org/assets/piece',
};
