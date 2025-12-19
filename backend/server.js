const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Allow all origins so the frontend can be hosted anywhere (Netlify, Vercel, etc.)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Drafts
app.get('/api/drafts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Error loading drafts from Supabase:', error);
      return res.status(500).json({ error: 'Failed to load drafts' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Unexpected error loading drafts:', err);
    res.status(500).json({ error: 'Failed to load drafts' });
  }
});

app.post('/api/drafts', async (req, res) => {
  const draft = req.body;
  if (!draft || !draft.id) {
    return res.status(400).json({ error: 'Draft must include an id' });
  }

  const row = {
    id: draft.id,
    report_number: draft.reportNumber || null,
    district: draft.district || null,
    cap_practitioner: draft.capPractitioner || null,
    address_of_infraction: draft.addressOfInfraction || null,
    nearest_landmark: draft.nearestLandmark || null,
    gps_coordinates: draft.gpsCoordinates || null,
    date_of_identification: draft.dateOfIdentification || null,
    number_of_floors: draft.numberOfFloors || null,
    stage_of_work: draft.stageOfWork || null,
    state_of_building: draft.stateOfBuilding || null,
    observations_rich_text: draft.observationsRichText || null,
    executive_summary: draft.executiveSummary || null,
    site_location: draft.siteLocation || null,
    type_of_building: draft.typeOfBuilding || null,
    recommendation_status: draft.recommendationStatus || null,
    challenges_and_limitations: draft.challengesAndLimitations || null,
    photos: draft.photos || [],
    saved_at: draft.savedAt ? new Date(draft.savedAt).toISOString() : new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('drafts')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Error saving draft to Supabase:', error);
      return res.status(500).json({ error: 'Failed to save draft' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error saving draft:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

app.delete('/api/drafts/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting draft from Supabase:', error);
      return res.status(500).json({ error: 'Failed to delete draft' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error deleting draft:', err);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// Reports
app.get('/api/reports', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('generated_at', { ascending: false });

    if (error) {
      console.error('Error loading reports from Supabase:', error);
      return res.status(500).json({ error: 'Failed to load reports' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Unexpected error loading reports:', err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

app.post('/api/reports', async (req, res) => {
  const report = req.body;
  if (!report || !report.id) {
    return res.status(400).json({ error: 'Report must include an id' });
  }

  const row = {
    id: report.id,
    report_number: report.reportNumber || null,
    district: report.district || null,
    cap_practitioner: report.capPractitioner || null,
    address_of_infraction: report.addressOfInfraction || null,
    nearest_landmark: report.nearestLandmark || null,
    gps_coordinates: report.gpsCoordinates || null,
    date_of_identification: report.dateOfIdentification || null,
    number_of_floors: report.numberOfFloors || null,
    stage_of_work: report.stageOfWork || null,
    state_of_building: report.stateOfBuilding || null,
    observations_rich_text: report.observationsRichText || null,
    executive_summary: report.executiveSummary || null,
    site_location: report.siteLocation || null,
    type_of_building: report.typeOfBuilding || null,
    recommendation_status: report.recommendationStatus || null,
    challenges_and_limitations: report.challengesAndLimitations || null,
    photos: report.photos || [],
    generated_at: report.generatedAt ? new Date(report.generatedAt).toISOString() : new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('reports')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Error saving report to Supabase:', error);
      return res.status(500).json({ error: 'Failed to save report' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error saving report:', err);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report from Supabase:', error);
      return res.status(500).json({ error: 'Failed to delete report' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error deleting report:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

app.listen(PORT, () => {
  console.log(`CAP backend server listening on http://localhost:${PORT}`);
});


