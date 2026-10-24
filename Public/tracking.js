'use strict';
const byId = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const form = byId('trackAgainForm');
const input = byId('trackAgainInput');
const message = byId('resultMessage');
const result = byId('shipmentResult');
const year = byId('currentYear');
if (year) year.textContent = new Date().getFullYear();
const safe = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showMessage(text, error=false){message.textContent=text;message.classList.toggle('error',error)}
async function track(number){
  const trackingNumber = String(number || '').trim();
  if (!trackingNumber) { showMessage('Please enter your tracking number.', true); return; }
  showMessage('Searching for your shipment…'); result.hidden = true;
  try {
    const response = await fetch(`/api/track/${encodeURIComponent(trackingNumber)}`);
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || 'We could not find a shipment with that tracking number. Please check it and try again.');
    const shipment = data.shipment || data;
    byId('resultTrackingNumber').textContent = shipment.tracking_number || trackingNumber;
    byId('resultStatus').textContent = shipment.status || 'Status unavailable';
    byId('resultOrigin').textContent = shipment.origin || 'Not available';
    byId('resultDestination').textContent = shipment.destination || 'Not available';
    byId('resultUpdated').textContent = shipment.updated_at ? new Date(shipment.updated_at).toLocaleString() : 'Not available';
    const events = shipment.events || shipment.history || [];
    byId('shipmentHistory').innerHTML = events.length ? events.map(ev => `<div class="history-item"><strong>${safe(ev.status || ev.title || 'Shipment update')}</strong><div>${safe(ev.description || ev.location || '')}</div><small>${ev.created_at || ev.event_time ? safe(new Date(ev.created_at || ev.event_time).toLocaleString()) : ''}</small></div>`).join('') : '<p>No tracking updates are available yet.</p>';
    result.hidden = false; showMessage('Shipment information loaded.');
  } catch (error) { showMessage(error.message || 'Unable to retrieve shipment information. Please try again later.', true); }
}
form.addEventListener('submit', event => { event.preventDefault(); const number=input.value.trim(); if(number){history.replaceState({},'',`tracking.html?number=${encodeURIComponent(number)}`);track(number);} });
const initial = params.get('number'); if(initial){input.value=initial;track(initial);}
