import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, FileText, Trash2, Download, Mail } from 'lucide-react';

const API_BASE = 'https://caps-team.up.railway.app/api';

const CAPReportSystem = () => {
  const [formData, setFormData] = useState({
    reportNumber: '',
    district: '',
    capPractitioner: '',
    addressOfInfraction: '',
    nearestLandmark: '',
    gpsCoordinates: '',
    dateOfIdentification: '',
    numberOfFloors: '',
    stageOfWork: '',
    stateOfBuilding: {
      abandoned: false,
      completed: false,
      underConstruction: false,
      distressed: false
    },
    observations: {
      noticeLetter: false,
      noPlanningPermit: false,
      noStageCertification: false,
      noInsurance: false,
      noProjectBoard: false,
      nonConformity: false,
      harassment: false,
      falseInformation: false,
      breakOfSeal: false,
      noCertificateOfCompletion: false,
      noFireSafety: false,
      distressedStructure: false,
      noDemolitionPermit: false,
      noAuthorizationToDemolish: false,
      otherObservations: ''
    },
    observationsRichText: '',
    executiveSummary: '',
    siteLocation: '',
    typeOfBuilding: '',
    recommendationStatus: '',
    challengesAndLimitations: '',
    photos: []
  });

  const [drafts, setDrafts] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [activeTab, setActiveTab] = useState('form');
  const [emailAddress, setEmailAddress] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const fileInputRef = useRef(null);
  const observationsEditorRef = useRef(null);

  useEffect(() => {
    if (observationsEditorRef.current) {
      const currentHtml = observationsEditorRef.current.innerHTML;
      const targetHtml = formData.observationsRichText || '';
      if (currentHtml !== targetHtml) {
        observationsEditorRef.current.innerHTML = targetHtml;
      }
    }
  }, [formData.observationsRichText]);

  // Load existing drafts and reports from backend (or localStorage fallback) after login
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadData = async () => {
      try {
        const [draftRes, reportRes] = await Promise.all([
          fetch(`${API_BASE}/drafts`),
          fetch(`${API_BASE}/reports`)
        ]);

        const draftsData = await draftRes.json();
        const reportsData = await reportRes.json();

        const safeDrafts = Array.isArray(draftsData) ? draftsData : [];
        const safeReports = Array.isArray(reportsData) ? reportsData : [];

        setDrafts(safeDrafts);
        setSavedReports(safeReports);

        try {
          localStorage.setItem('capDrafts', JSON.stringify(safeDrafts));
          localStorage.setItem('capSavedReports', JSON.stringify(safeReports));
        } catch (storageErr) {
          console.error('Error caching drafts/reports to localStorage:', storageErr);
        }
      } catch (err) {
        console.error('Error loading drafts/reports from backend:', err);

        // Fallback to any data already stored locally
        try {
          const storedDrafts = localStorage.getItem('capDrafts');
          const storedReports = localStorage.getItem('capSavedReports');
          if (storedDrafts) {
            setDrafts(JSON.parse(storedDrafts));
          }
          if (storedReports) {
            setSavedReports(JSON.parse(storedReports));
          }
        } catch (parseErr) {
          console.error('Error reading drafts/reports from localStorage:', parseErr);
        }
      }
    };

    loadData();
  }, [isLoggedIn]);

  const applyObservationFormat = (command) => {
    const editor = observationsEditorRef.current;
    if (!editor) return;

    // Special handling for bullets and numbered "lists" so they work reliably on mobile
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      let html = editor.innerHTML || '';
      const trimmed = html.trim();

      let prefix = '• ';
      if (command === 'insertOrderedList') {
        // Determine next number based on existing lines (1., 2., 3., ...)
        const text = editor.innerText || '';
        const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
        let lastNumber = 0;
        for (let i = lines.length - 1; i >= 0; i--) {
          const match = lines[i].match(/^(\d+)\./);
          if (match) {
            lastNumber = parseInt(match[1], 10) || 0;
            break;
          }
        }
        const nextNumber = lastNumber + 1;
        prefix = `${nextNumber}. `;
      }

      if (!trimmed) {
        editor.innerHTML = prefix;
      } else {
        editor.innerHTML = trimmed + '<br>' + prefix;
      }

      // Move caret to the end of the content
      editor.focus();
      const selection = window.getSelection && window.getSelection();
      if (selection && document.createRange) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      setFormData(prev => ({
        ...prev,
        observationsRichText: editor.innerHTML
      }));
      return;
    }

    // Default: use execCommand for inline styles like bold/underline
    editor.focus();
    document.execCommand(command, false, null);
    setFormData(prev => ({
      ...prev,
      observationsRichText: editor.innerHTML
    }));
  };

  const formatText = (type) => {
    switch (type) {
      case 'bold':
        applyObservationFormat('bold');
        break;
      case 'underline':
        applyObservationFormat('underline');
        break;
      case 'list':
        applyObservationFormat('insertUnorderedList');
        break;
      case 'numbered':
        applyObservationFormat('insertOrderedList');
        break;
      default:
        break;
    }
  };

  const handleObservationsInput = () => {
    if (observationsEditorRef.current) {
      setFormData(prev => ({
        ...prev,
        observationsRichText: observationsEditorRef.current.innerHTML
      }));
    }
  };

  const handleObservationsKeyDown = (e) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();
    const editor = observationsEditorRef.current;
    if (!editor) return;

    const text = editor.innerText || '';
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

    let prefix = '';
    if (lines.length > 0) {
      const last = lines[lines.length - 1];
      const numMatch = last.match(/^(\d+)\./);
      if (numMatch) {
        const lastNum = parseInt(numMatch[1], 10) || 0;
        prefix = `${lastNum + 1}. `;
      } else if (last.startsWith('•')) {
        prefix = '• ';
      }
    }

    let html = editor.innerHTML || '';
    const trimmed = html.trim();

    if (prefix) {
      if (!trimmed) {
        editor.innerHTML = prefix;
      } else {
        editor.innerHTML = trimmed + '<br>' + prefix;
      }
    } else {
      editor.innerHTML = html + '<br>';
    }

    editor.focus();
    const selection = window.getSelection && window.getSelection();
    if (selection && document.createRange) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setFormData(prev => ({
      ...prev,
      observationsRichText: editor.innerHTML
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const username = loginUsername.trim();
    const password = loginPassword.trim();

    if (username === 'CAPS MONITORING TEAM' && password === 'CAPS') {
      setIsLoggedIn(true);
      localStorage.setItem('capIsLoggedIn', 'true');
      setLoginError('');
      setLoginPassword('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('capIsLoggedIn');
  };

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      if (file && file.type.startsWith('image/')) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });

          const reader = new FileReader();
          reader.onload = (event) => {
            const newPhoto = {
              id: Date.now() + Math.random(),
              data: event.target.result,
              gps: `Lat: ${position.coords.latitude.toFixed(6)}, Long: ${position.coords.longitude.toFixed(6)}`,
              timestamp: new Date().toLocaleString(),
              title: ''
            };

            setFormData(prev => {
              const updatedPhotos = [...prev.photos, newPhoto];
              const hasValidGps = newPhoto.gps && newPhoto.gps !== 'GPS location unavailable';
              const gpsCoordinates = !prev.gpsCoordinates && hasValidGps
                ? newPhoto.gps
                : prev.gpsCoordinates;

              return {
                ...prev,
                photos: updatedPhotos,
                gpsCoordinates
              };
            });
          };
          reader.readAsDataURL(file);
        } catch (error) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const newPhoto = {
              id: Date.now() + Math.random(),
              data: event.target.result,
              gps: 'GPS location unavailable',
              timestamp: new Date().toLocaleString(),
              title: ''
            };

            setFormData(prev => ({
              ...prev,
              photos: [...prev.photos, newPhoto]
            }));
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removePhoto = (photoId) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photoId)
    }));
  };

  const handlePhotoTitleChange = (photoId, value) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.map(photo =>
        photo.id === photoId ? { ...photo, title: value } : photo
      )
    }));
  };

  const saveToDraft = async () => {
    const isEditingExisting = !!formData.id;
    const draftId = isEditingExisting ? formData.id : Date.now();

    const draft = {
      ...formData,
      id: draftId,
      savedAt: new Date().toLocaleString()
    };

    const updatedDrafts = isEditingExisting
      ? drafts.map(d => (d.id === draftId ? draft : d))
      : [draft, ...drafts];

    setDrafts(updatedDrafts);
    localStorage.setItem('capDrafts', JSON.stringify(updatedDrafts));

    try {
      await fetch(`${API_BASE}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
    } catch (err) {
      console.error('Error saving draft to backend:', err);
    }

    alert('Draft saved successfully!');
    setActiveTab('drafts');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    localStorage.removeItem('capCurrentDraft');
    setFormData({
      reportNumber: '',
      district: '',
      capPractitioner: '',
      addressOfInfraction: '',
      nearestLandmark: '',
      gpsCoordinates: '',
      dateOfIdentification: '',
      numberOfFloors: '',
      stageOfWork: '',
      stateOfBuilding: {
        abandoned: false,
        completed: false,
        underConstruction: false,
        distressed: false
      },
      observationsRichText: '',
      executiveSummary: '',
      siteLocation: '',
      typeOfBuilding: '',
      recommendationStatus: '',
      challengesAndLimitations: '',
      photos: []
    });
  };

  const generatePDFHTML = (reportData) => {
    const buildingStates = [];
    if (reportData.stateOfBuilding?.abandoned) buildingStates.push('ABANDONED');
    if (reportData.stateOfBuilding?.completed) buildingStates.push('COMPLETED');
    if (reportData.stateOfBuilding?.underConstruction) buildingStates.push('UNDER CONSTRUCTION/RENOVATION');
    if (reportData.stateOfBuilding?.distressed) buildingStates.push('DISTRESSED/DEFECTIVE');

    const observationsHtml = reportData.observationsRichText || '';

    const photoRows = (reportData.photos || []).map((photo, index) => `
      <div class="photo-card">
        <div class="photo-inner">
          <img src="${photo.data}" class="photo-image" />
          <p class="photo-title">APPENDIX ${index + 1}</p>
          ${photo.title ? `<p class="photo-custom-title">${photo.title}</p>` : ''}
          <p class="photo-meta">GPS: ${photo.gps}</p>
          <p class="photo-time">${photo.timestamp}</p>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CAP Observation Report - ${reportData.reportNumber || 'Draft'}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            margin: 0;
          }
          .page-footer {
            position: fixed;
            left: 20mm;
            right: 20mm;
            bottom: 10mm;
            z-index: -1;
          }
          .page-footer img {
            width: 100%;
          }
          .page-header-first img {
            width: 100%;
            display: block;
          }
          .section {
            margin-bottom: 16px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 4px 6px;
            vertical-align: top;
          }
          td.label {
            width: 35%;
            font-weight: bold;
          }
          .photos-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .photo-card {
            page-break-inside: avoid;
          }
          .photo-inner {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
          }
          .photo-image {
            width: 100%;
            height: 160px;
            object-fit: cover;
          }
          .photo-title {
            margin-top: 8px;
            font-weight: bold;
          }
          .photo-custom-title {
            margin-top: 4px;
            font-size: 10px;
            font-style: italic;
          }
          .photo-meta {
            font-size: 12px;
            color: #666;
          }
          .photo-time {
            font-size: 11px;
            color: #999;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="page-footer">
          <img src="/footer.png" alt="Footer" />
        </div>
        <div class="page-content">
          <div class="page-header-first">
            <img src="/header.png" alt="Header" />
          </div>
          <div class="report-title">
            <h2>CAP OBSERVATION SHEET</h2>
            <p>Monitoring and Regulation of Buildings Report</p>
            <p><strong>Report No: ${reportData.reportNumber || 'DRAFT'}</strong></p>
          </div>
          <div class="section">
            <table>
              <tr>
                <td class="label">DISTRICT</td>
                <td>${reportData.district || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">CAP PRACTITIONER</td>
                <td>${reportData.capPractitioner || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">ADDRESS OF INFRACTION</td>
                <td>${reportData.addressOfInfraction || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">NEAREST LANDMARK (IF ANY)</td>
                <td>${reportData.nearestLandmark || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">GPS COORDINATES</td>
                <td>${reportData.gpsCoordinates || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">DATE OF IDENTIFICATION</td>
                <td>${reportData.dateOfIdentification || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">NO. OF FLOORS</td>
                <td>${reportData.numberOfFloors || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">STAGE OF WORK</td>
                <td>${reportData.stageOfWork || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">STATE OF BUILDING</td>
                <td>${buildingStates.join(', ') || 'N/A'}</td>
              </tr>
            </table>
          </div>
          <div class="section">
            <div class="section-title">OBSERVATIONS</div>
            <p style="text-align: justify; margin-bottom: 8px;">
              Based on our evaluation, of the current state of work, at the above site, we report as follows:
            </p>
            <div style="margin-top: 4px;">
              ${observationsHtml || '<p>No observations recorded</p>'}
            </div>
          </div>
          <div class="section page-break">
            <div class="section-title">1. EXECUTIVE SUMMARY</div>
            <p style="text-align: justify;">${reportData.executiveSummary || 'N/A'}</p>
          </div>
          <div class="section">
            <div class="section-title">2. CHALLENGES AND LIMITATIONS</div>
            <p style="text-align: justify;">${reportData.challengesAndLimitations || 'N/A'}</p>
          </div>
          <div class="section page-break">
            <div class="section-title">3. APPENDICES - PHOTOGRAPHIC EVIDENCE</div>
            <div class="photos-grid">
              ${photoRows}
            </div>
          </div>
          <div class="signature-section">
            <img src="/signature.png" class="signature-image" alt="Signature" />
            <div class="section-title">AUTHORIZED SIGNATORY</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const downloadPDF = async (report) => {
    const htmlContent = generatePDFHTML(report);

    // Opera Mini has very limited support for downloads and heavy JS; fall back to simple HTML view
    const ua = (navigator.userAgent || '').toLowerCase();
    const isOperaMini = ua.includes('opera mini');

    if (isOperaMini) {
      const viewWindow = window.open('', '_self');
      if (!viewWindow) return;
      viewWindow.document.write(htmlContent);
      viewWindow.document.close();
      return;
    }

    // Prefer html2pdf.js when available for a direct PDF download
    if (window.html2pdf) {
      try {
        await window.html2pdf()
          .from(htmlContent)
          .set({
            margin: 0,
            filename: `CAP_Report_${report.reportNumber || 'Draft'}.pdf`,
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
          })
          .save();
        return;
      } catch (err) {
        // Fall back to print window behaviour below
      }
    }

    // Fallback: open in new window and trigger print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  const generatePDF = async () => {
    if (formData.photos.length < 1) {
      alert('Please add at least 1 photo with GPS location before generating PDF');
      return;
    }

    if (!formData.reportNumber) {
      alert('Please enter a Report Number before generating PDF');
      return;
    }

    const reportData = {
      id: Date.now(),
      ...formData,
      generatedAt: new Date().toLocaleString()
    };

    const updatedReports = [reportData, ...savedReports];
    setSavedReports(updatedReports);
    localStorage.setItem('capSavedReports', JSON.stringify(updatedReports));

    // Sync report to backend so it’s available on all devices
    try {
      await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
    } catch (err) {
      console.error('Error saving report to backend:', err);
    }

    // Clear current draft after saving
    localStorage.removeItem('capCurrentDraft');
    
    alert('Report saved successfully! You can now download or email it from the "Saved Reports" section.');
    setActiveTab('saved');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset form
    setFormData({
      reportNumber: '',
      district: '',
      capPractitioner: '',
      addressOfInfraction: '',
      nearestLandmark: '',
      gpsCoordinates: '',
      dateOfIdentification: '',
      numberOfFloors: '',
      stageOfWork: '',
      stateOfBuilding: {
        abandoned: false,
        completed: false,
        underConstruction: false,
        distressed: false
      },
      observations: {
        noticeLetter: false,
        noPlanningPermit: false,
        noStageCertification: false,
        noInsurance: false,
        noProjectBoard: false,
        nonConformity: false,
        harassment: false,
        falseInformation: false,
        breakOfSeal: false,
        noCertificateOfCompletion: false,
        noFireSafety: false,
        distressedStructure: false,
        noDemolitionPermit: false,
        noAuthorizationToDemolish: false,
        otherObservations: ''
      },
      observationsRichText: '',
      executiveSummary: '',
      siteLocation: '',
      typeOfBuilding: '',
      recommendationStatus: '',
      challengesAndLimitations: '',
      photos: []
    });
  };

  const loadDraft = (draft) => {
    setFormData(draft);
  };

  const deleteDraft = async (draftId) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    setDrafts(updatedDrafts);
    localStorage.setItem('capDrafts', JSON.stringify(updatedDrafts));

    try {
      await fetch(`${API_BASE}/drafts/${draftId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error deleting draft from backend:', err);
    }
  };

  const deleteReport = async (reportId) => {
    const updatedReports = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updatedReports);
    localStorage.setItem('capSavedReports', JSON.stringify(updatedReports));

    try {
      await fetch(`${API_BASE}/reports/${reportId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error deleting report from backend:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-4">CAPS Monitoring Login</h1>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CAPS MONITORING TEAM"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CAPS"
              />
            </div>
            {loginError && (
              <p className="text-red-600 text-sm">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Login
            </button>
            <p className="text-xs text-gray-500 text-center">
              Username: CAPS MONITORING TEAM &nbsp;|&nbsp; Password: CAPS
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Letterhead */}
      <div className="bg-white shadow-sm border-b-4 border-blue-600">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-4 px-6 rounded-lg">
              <h1 className="text-3xl font-bold">envostructs</h1>
              <p className="text-sm mt-1">51, Akanro Street Via Apapa-Oshodi Exp. Way, by Ilasa Bus Stop Mushin Lagos</p>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-6">CAP OBSERVATION SHEET</h2>
            <p className="text-gray-600 mt-2">Monitoring and Regulation of Buildings Report</p>
          </div>
          <div className="mt-4 sm:mt-0 text-center sm:text-right">
            <p className="text-xs text-gray-600">Logged in as CAPS MONITORING TEAM</p>
            <button
              onClick={handleLogout}
              className="mt-1 inline-flex items-center px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex flex-wrap gap-2 sm:gap-4 border-b">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-6 py-3 font-semibold transition ${activeTab === 'form' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            New Report
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-6 py-3 font-semibold transition ${activeTab === 'drafts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Drafts ({drafts.length})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-3 font-semibold transition ${activeTab === 'saved' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Saved Reports ({savedReports.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {activeTab === 'form' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Report Number */}
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-600 p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">REPORT NUMBER *</label>
              <input
                type="text"
                name="reportNumber"
                value={formData.reportNumber}
                onChange={handleInputChange}
                placeholder="e.g., N° JB000001"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">DISTRICT</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">CAP PRACTITIONER</label>
                <input
                  type="text"
                  name="capPractitioner"
                  value={formData.capPractitioner}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ADDRESS OF INFRACTION</label>
                <input
                  type="text"
                  name="addressOfInfraction"
                  value={formData.addressOfInfraction}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">NEAREST LANDMARK (IF ANY)</label>
                <input
                  type="text"
                  name="nearestLandmark"
                  value={formData.nearestLandmark}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">GPS COORDINATES</label>
                <input
                  type="text"
                  name="gpsCoordinates"
                  value={formData.gpsCoordinates}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">DATE OF IDENTIFICATION</label>
                <input
                  type="date"
                  name="dateOfIdentification"
                  value={formData.dateOfIdentification}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">NO. OF FLOORS</label>
                <input
                  type="text"
                  name="numberOfFloors"
                  value={formData.numberOfFloors}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">STAGE OF WORK</label>
                <input
                  type="text"
                  name="stageOfWork"
                  value={formData.stageOfWork}
                  onChange={handleInputChange}
                  placeholder="e.g., Piling"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* State of Building */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">STATE OF BUILDING</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="stateOfBuilding.abandoned"
                    checked={formData.stateOfBuilding.abandoned}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span>ABANDONED</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="stateOfBuilding.completed"
                    checked={formData.stateOfBuilding.completed}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span>COMPLETED</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="stateOfBuilding.underConstruction"
                    checked={formData.stateOfBuilding.underConstruction}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span>UNDER CONSTRUCTION/RENOVATION</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="stateOfBuilding.distressed"
                    checked={formData.stateOfBuilding.distressed}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span>DISTRESSED/DEFECTIVE</span>
                </label>
              </div>
            </div>

            {/* Observations - Rich Text */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">OBSERVATIONS</h3>
              <p className="text-sm text-gray-700 mb-2">
                Based on our evaluation, of the current state of work, at the above site, we report as follows:
              </p>
              <div className="border border-gray-300 rounded-lg">
                {/* Formatting Toolbar */}
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-t-lg border-b">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); formatText('bold'); }}
                    className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); formatText('list'); }}
                    className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
                    title="Bullet List"
                  >
                    •
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); formatText('numbered'); }}
                    className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
                    title="Numbered List"
                  >
                    1.
                  </button>
                </div>
                <div
                  ref={observationsEditorRef}
                  className="min-h-[120px] px-3 py-2 text-sm focus:outline-none rounded-b-lg"
                  contentEditable
                  onInput={handleObservationsInput}
                  onBlur={handleObservationsInput}
                />
              </div>
            </div>

            {/* Executive Summary */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-800 mb-3">1. EXECUTIVE SUMMARY</label>
              <textarea
                name="executiveSummary"
                value={formData.executiveSummary}
                onChange={handleInputChange}
                rows="8"
                placeholder="Provide a comprehensive executive summary of the monitoring report..."
                className="w-full border border-gray-300 rounded px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Challenges and Limitations */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-800 mb-3">2. CHALLENGES AND LIMITATIONS</label>
              <textarea
                name="challengesAndLimitations"
                value={formData.challengesAndLimitations}
                onChange={handleInputChange}
                rows="8"
                placeholder="Document any challenges encountered and limitations during the monitoring process..."
                className="w-full border border-gray-300 rounded px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Photo Upload Section */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-800 mb-3">3. APPENDICES - PHOTOGRAPHIC EVIDENCE</label>
              <p className="text-sm text-gray-600 mb-4">Please upload at least 1 photo with GPS location (Required)</p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoCapture}
                accept="image/*"
                multiple
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                <Camera size={20} />
                Add Photos ({formData.photos.length}/1 minimum)
              </button>

              {formData.photos.length > 0 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={photo.id} className="border border-gray-300 rounded-lg p-3">
                      <img src={photo.data} alt={`Site ${index + 1}`} className="w-full h-48 object-cover rounded mb-2" />
                      <div className="text-sm">
                        <p className="font-semibold">APPENDIX {index + 1}</p>
                        <p className="text-gray-600">{photo.gps}</p>
                        <p className="text-gray-500 text-xs">{photo.timestamp}</p>
                      </div>
                      <input
                        type="text"
                        value={photo.title || ''}
                        onChange={(e) => handlePhotoTitleChange(photo.id, e.target.value)}
                        placeholder="Enter photo title / description"
                        className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature Section */}
            <div className="mb-8 border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">AUTHORIZED SIGNATORY</h3>
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <p className="text-sm text-gray-600 italic mb-4">Signature will be automatically applied to the PDF report</p>
                <div className="inline-block">
                  <div className="border-b-2 border-gray-400 w-64 pb-2 mb-2">
                    <p className="text-lg font-bold" style={{fontFamily: 'cursive'}}>Authorized Signature</p>
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end border-t pt-6">
              <button
                onClick={saveToDraft}
                className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
              >
                <Save size={20} />
                Save as Draft
              </button>
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
              >
                <FileText size={20} />
                Save Report
              </button>
            </div>
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Saved Drafts</h2>
            {drafts.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No drafts saved yet</p>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <div key={draft.id} className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{draft.reportNumber || 'Untitled Draft'}</h3>
                        <p className="text-sm text-gray-600 mt-1">{draft.district || 'No district'}</p>
                        <p className="text-sm text-gray-600">{draft.addressOfInfraction || 'No address'}</p>
                        <p className="text-xs text-gray-500 mt-2">Saved: {draft.savedAt}</p>
                        <p className="text-xs text-gray-500">Photos: {draft.photos?.length || 0}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            loadDraft(draft);
                            setActiveTab('form');
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this draft?')) {
                              deleteDraft(draft.id);
                            }
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Saved PDF Reports</h2>
            {savedReports.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No reports generated yet</p>
            ) : (
              <div className="space-y-4">
                {savedReports.map((report) => (
                  <div key={report.id} className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{report.reportNumber}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.district}</p>
                        <p className="text-sm text-gray-600">{report.addressOfInfraction}</p>
                        <p className="text-xs text-gray-500 mt-2">Generated: {report.generatedAt}</p>
                        <p className="text-xs text-gray-500">Photos: {report.photos.length}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadPDF(report)}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                        >
                          <Download size={16} />
                          Print/Download
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this report?')) {
                              deleteReport(report.id);
                            }
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
        <p>© 2025 envostructs - LASBCA Certified Accreditors Programme</p>
        <p className="mt-1">Auto-save enabled - Your work is being saved automatically</p>
      </div>
    </div>
  );
};

export default CAPReportSystem;