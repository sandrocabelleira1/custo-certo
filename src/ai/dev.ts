import * as dotenv from 'dotenv';
dotenv.config();

// Flows will be imported for their side effects in this file.
import './flows/read-barcode-flow';
import './flows/analyze-recipe-flow';
import './flows/generate-checklist-flow';
import './flows/generate-manual-flow';
import './flows/generate-sales-projection-flow';
import './flows/analyze-financials-flow';
import './tools/get-weather-tool';
