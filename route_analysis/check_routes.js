import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./test_mobility_solution.json', 'utf8'));
let badRoutes = [];
const routes = data.result.routes
routes.forEach((r, i) => {
  if (!Array.isArray(r.steps)) badRoutes.push({ index: i, vehicle: r.vehicle, steps: r.steps });
});
console.log(badRoutes.length ? badRoutes : 'All routes have valid steps arrays.');
