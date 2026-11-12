import { demoJapan } from './models/demoCountries.js';
import { createApp } from './ui/createApp.js';

const app = createApp(demoJapan);
document.body.append(app.root);
