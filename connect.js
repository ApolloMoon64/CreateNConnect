const meetingStorageKey = 'connect-page-meetings';
const profileStorageKey = 'connect-page-profile';

const themeStyles = {
  sunrise: 'linear-gradient(135deg, #ffb36b, #ff6f47)',
  ocean: 'linear-gradient(135deg, #56c6ff, #356dff)',
  forest: 'linear-gradient(135deg, #74d39a, #29795b)',
  midnight: 'linear-gradient(135deg, #7261ff, #1f2855)'
};

const defaultMeetings = [
  {
    id: crypto.randomUUID(),
    title: 'Character Design Critique',
    type: 'Critique',
    region: 'North America',
    capacity: 12,
    attendees: ['maya@studio.com', 'iris@studio.com', 'leo@studio.com', 'nora@studio.com'],
    dateTime: '2026-04-18T18:30',
    location: 'Boston studio + Zoom hybrid',
    hostEmail: 'host@makerslounge.com',
    description: 'Bring one character sheet and be ready for live visual feedback focused on silhouette, color, and storytelling.',
    theme: 'sunrise',
    zoomLink: createZoomLink()
  },
  {
    id: crypto.randomUUID(),
    title: 'Global Crochet Hangout',
    type: 'Community check-in',
    region: 'Asia',
    capacity: 8,
    attendees: ['sam@threadmail.com', 'ivy@threadmail.com', 'zoe@threadmail.com', 'tess@threadmail.com', 'alma@threadmail.com', 'rui@threadmail.com', 'noa@threadmail.com'],
    dateTime: '2026-04-21T09:00',
    location: 'Online',
    hostEmail: 'loops@crochetcommons.com',
    description: 'A relaxed catch-up for pattern swaps, show-and-tell, and one quick problem-solving round for tricky stitches.',
    theme: 'forest',
    zoomLink: createZoomLink()
  }
];

let communities = [];
let meetings = readStorage(meetingStorageKey, defaultMeetings);
let currentUser = getCurrentUser();
let selectedRegion = 'All';
let activeCommunityId = null;

function saveCurrentUser(user) {
  const { profileImage, ...storageUser } = user || {};
  localStorage.setItem('currentUser', JSON.stringify(storageUser));
}

const communityList = document.getElementById('community-list');
const groupGrid = document.getElementById('group-grid');
const chatThread = document.getElementById('chat-thread');
const chatForm = document.getElementById('chat-form');
const meetingList = document.getElementById('meeting-list');
const regionList = document.getElementById('region-list');
const activeCommunityName = document.getElementById('active-community-name');
const meetingForm = document.getElementById('meeting-form');
const communityForm = document.getElementById('community-form');
const meetingFormStatus = document.getElementById('meeting-form-status');
const communityFormStatus = document.getElementById('community-form-status');
const quickCreateGroup = document.getElementById('quick-create-group');
const stageTabs = Array.from(document.querySelectorAll('.stage-tab'));
const stagePanels = Array.from(document.querySelectorAll('.stage-panel'));
const topShell = document.querySelector('.top-shell');
const railToggle = document.getElementById('rail-toggle');

bindEvents();
initializeConnectPage();

function bindEvents() {
  const localServerBase = 'http://localhost:3000';
  const localPageLinks = [
    'index.html',
    'auth.html',
    'profile.html',
    'commissions.html',
    'tutorial.html',
    'connect.html'
  ];

  if (window.location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (localPageLinks.includes(href)) {
        link.setAttribute('href', `${localServerBase}/${href}`);
      }
    });
  }

  railToggle.addEventListener('click', () => {
    const isCollapsed = topShell.classList.toggle('rail-collapsed');
    railToggle.setAttribute('aria-expanded', String(!isCollapsed));
    railToggle.setAttribute('aria-label', isCollapsed ? 'Expand community sidebar' : 'Collapse community sidebar');
  });

  const navItems = document.querySelectorAll('.top-nav .nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      if (item.getAttribute('href') === '#') {
        event.preventDefault();
      }

      navItems.forEach((nav) => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });

  stageTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const panel = tab.dataset.panel;
      stageTabs.forEach((item) => item.classList.toggle('active', item === tab));
      stagePanels.forEach((item) => item.classList.toggle('active', item.dataset.panelContent === panel));
    });
  });

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(chatForm);
    const message = String(formData.get('message') || '').trim();
    if (!message) return;

    try {
      setChatEnabled(false);
      const data = await apiFetchJSON(`/api/communities/${encodeURIComponent(activeCommunityId)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: message })
      });

      communities = communities.map((community) => {
        if (String(community.id) !== String(activeCommunityId)) return community;

        return {
          ...community,
          messageCount: Number(community.messageCount || 0) + 1,
          messages: [...(community.messages || []), data.message]
        };
      });

      renderCommunities();
      renderGroups();
      renderChat();
      chatForm.reset();
    } catch (error) {
      window.alert(error.message);
      renderChat();
    }
  });

  meetingForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(meetingForm);
    const newMeeting = {
      id: crypto.randomUUID(),
      title: String(formData.get('title')).trim(),
      type: String(formData.get('type')).trim(),
      region: String(formData.get('region')).trim(),
      capacity: Number(formData.get('capacity')),
      attendees: [],
      dateTime: String(formData.get('datetime')).trim(),
      location: String(formData.get('location')).trim(),
      hostEmail: currentUser.email || '',
      description: String(formData.get('description')).trim(),
      theme: String(formData.get('theme')).trim(),
      zoomLink: createZoomLink()
    };

    meetings = [newMeeting, ...meetings];
    persistMeetings();

    meetingForm.reset();
    meetingFormStatus.textContent = `Created "${newMeeting.title}" and prepared the host Zoom details.`;
    renderMeetings();
  });

  communityForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(communityForm);
    const payload = {
      name: String(formData.get('name')).trim(),
      category: String(formData.get('category')).trim(),
      region: String(formData.get('region')).trim(),
      description: String(formData.get('description')).trim()
    };

    try {
      const data = await apiFetchJSON('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const newCommunity = { ...data.community, messages: [] };
      communities = [newCommunity, ...communities];
      activeCommunityId = newCommunity.id;

      communityForm.reset();
      communityFormStatus.textContent = `Created "${newCommunity.name}" and opened its community chat.`;
      renderCommunities();
      renderGroups();
      renderChat();
    } catch (error) {
      communityFormStatus.textContent = error.message;
    }
  });

  quickCreateGroup.addEventListener('click', () => {
    communityForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    communityForm.querySelector('input[name="name"]').focus();
  });
}

async function initializeConnectPage() {
  renderAll();
  setCommunityFormsEnabled(false);

  try {
    const sessionData = await apiFetchJSON('/api/auth/me');
    currentUser = sessionData.user;
    saveCurrentUser(currentUser);
    await loadCommunities();
    setCommunityFormsEnabled(true);
  } catch (error) {
    communities = [];
    activeCommunityId = null;
    localStorage.removeItem('currentUser');
    renderRegions();
    renderCommunities();
    renderGroups();
    activeCommunityName.textContent = 'Community chat';
    chatThread.innerHTML = '<p class="muted-copy">Please log in to join communities and see shared messages.</p>';
    communityFormStatus.textContent = 'Log in to create a community.';
    setChatEnabled(false);
    setCommunityFormsEnabled(false);
  }
}

async function loadCommunities() {
  const data = await apiFetchJSON('/api/communities');
  communities = data.communities.map((community) => ({
    ...community,
    messages: []
  }));

  const currentActiveCommunity = communities.find((community) => String(community.id) === String(activeCommunityId));
  if (!currentActiveCommunity || !currentActiveCommunity.joined) {
    activeCommunityId = (communities.find((community) => community.joined) || null)?.id || null;
  }

  if (activeCommunityId) {
    await loadActiveCommunityMessages();
  }

  renderAll();
}

async function loadActiveCommunityMessages() {
  const activeCommunity = communities.find((community) => String(community.id) === String(activeCommunityId));
  if (!activeCommunity || !activeCommunity.joined) return;

  const data = await apiFetchJSON(`/api/communities/${encodeURIComponent(activeCommunityId)}/messages`);
  communities = communities.map((community) =>
    String(community.id) === String(activeCommunityId)
      ? { ...community, messages: data.messages, messageCount: data.messages.length }
      : community
  );
}

async function readResponsePayload(response) {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('The server returned an unexpected response.');
  }
}

async function apiFetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

function renderAll() {
  renderRegions();
  renderCommunities();
  renderGroups();
  renderChat();
  renderMeetings();
}

function renderRegions() {
  const regions = ['All', 'North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'];

  regionList.innerHTML = '';
  regions.forEach((region) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `region-chip${selectedRegion === region ? ' active' : ''}`;
    button.textContent = region;
    button.addEventListener('click', () => {
      selectedRegion = region;
      renderRegions();
      renderCommunities();
      renderGroups();
      renderChat();
      renderMeetings();
    });
    regionList.appendChild(button);
  });
}

function renderCommunities() {
  const filteredCommunities = getFilteredCommunities();
  const visibleCommunities = filteredCommunities.filter((community) => community.joined);

  if (!visibleCommunities.length) {
    communityList.innerHTML = '<p class="muted-copy">No joined communities in this region yet.</p>';
    activeCommunityName.textContent = 'Community chat';
    setChatEnabled(false);
    return;
  }

  if (!visibleCommunities.some((community) => String(community.id) === String(activeCommunityId))) {
    activeCommunityId = visibleCommunities[0].id;
  }

  setChatEnabled(true);
  activeCommunityName.textContent = communities.find((community) => String(community.id) === String(activeCommunityId))?.name || 'Community chat';

  communityList.innerHTML = '';
  visibleCommunities.forEach((community) => {
    const card = document.createElement('article');
    card.className = `community-card${String(community.id) === String(activeCommunityId) ? ' active' : ''}`;
    card.innerHTML = `
      <h3>${escapeHtml(community.name)}</h3>
      <div class="community-meta">
        <span class="pill">${escapeHtml(community.category)}</span>
        <span class="pill">${escapeHtml(community.region)}</span>
      </div>
      <p>${escapeHtml(community.description)}</p>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = String(community.id) === String(activeCommunityId) ? 'Open now' : 'Open chat';
    button.addEventListener('click', async () => {
      activeCommunityId = community.id;
      chatThread.innerHTML = '<p class="muted-copy">Loading messages...</p>';
      await loadActiveCommunityMessages();
      renderCommunities();
      renderChat();
    });

    card.appendChild(button);
    communityList.appendChild(card);
  });
}

function renderGroups() {
  const filteredCommunities = getFilteredCommunities();
  groupGrid.innerHTML = '';

  if (!filteredCommunities.length) {
    groupGrid.innerHTML = '<p class="muted-copy">No community groups exist in this region yet.</p>';
    return;
  }

  filteredCommunities.forEach((community) => {
    const card = document.createElement('article');
    card.className = 'group-card';
    card.innerHTML = `
      <h3>${escapeHtml(community.name)}</h3>
      <div class="group-meta">
        <span class="pill">${escapeHtml(community.category)}</span>
        <span class="pill">${escapeHtml(community.region)}</span>
        <span class="pill">${Number(community.messageCount || 0)} messages</span>
      </div>
      <p>${escapeHtml(community.description)}</p>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = community.joined ? 'Open community' : 'Join community';
    button.addEventListener('click', async () => {
      try {
        if (!community.joined) {
          const data = await apiFetchJSON(`/api/communities/${encodeURIComponent(community.id)}/join`, {
            method: 'POST'
          });

          communities = communities.map((item) =>
            String(item.id) === String(community.id)
              ? { ...item, ...data.community, messages: [] }
              : item
          );
        }

        activeCommunityId = community.id;
        chatThread.innerHTML = '<p class="muted-copy">Loading messages...</p>';
        await loadActiveCommunityMessages();
        renderCommunities();
        renderGroups();
        renderChat();
      } catch (error) {
        window.alert(error.message);
      }
    });

    card.appendChild(button);
    groupGrid.appendChild(card);
  });
}

function renderChat() {
  const activeCommunity = communities.find((community) => String(community.id) === String(activeCommunityId));

  if (!activeCommunity || (selectedRegion !== 'All' && activeCommunity.region !== selectedRegion)) {
    chatThread.innerHTML = '<p class="muted-copy">Join a community in this region to start messaging.</p>';
    activeCommunityName.textContent = 'Community chat';
    setChatEnabled(false);
    return;
  }

  setChatEnabled(true);
  activeCommunityName.textContent = activeCommunity.name;
  chatThread.innerHTML = '';

  (activeCommunity.messages || []).forEach((message) => {
    const bubble = document.createElement('article');
    bubble.className = `message-bubble${String(message.userId) === String(currentUser.id) ? ' self' : ''}`;
    bubble.innerHTML = `
      <div class="message-head">
        <strong>${escapeHtml(message.authorName || 'Creator')}</strong>
        <span>${formatShortTime(new Date(message.createdAt))}</span>
      </div>
      <p>${escapeHtml(message.text)}</p>
    `;
    chatThread.appendChild(bubble);
  });
}

function renderMeetings() {
  const filteredMeetings = getFilteredMeetings();
  meetingList.innerHTML = '';

  if (!filteredMeetings.length) {
    meetingList.innerHTML = '<p class="muted-copy">No meetings match this region yet. Create one below.</p>';
    return;
  }

  filteredMeetings.forEach((meeting) => {
    const remainingSeats = Math.max(meeting.capacity - meeting.attendees.length, 0);
    const isFull = remainingSeats === 0;

    const card = document.createElement('article');
    card.className = 'meeting-card';
    card.style.setProperty('--meeting-accent', themeStyles[meeting.theme] || themeStyles.sunrise);
    card.innerHTML = `
      <div class="meeting-body">
        <div>
          <h3>${meeting.title}</h3>
          <div class="meeting-meta">
            <span class="pill">${meeting.type}</span>
            <span class="pill">${meeting.region}</span>
            <span class="pill">${formatDateTime(meeting.dateTime)}</span>
          </div>
        </div>
        <p>${meeting.description}</p>
        <div class="meeting-meta">
          <span class="pill">${meeting.location}</span>
          <span class="pill">${meeting.attendees.length}/${meeting.capacity} joined</span>
        </div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'meeting-actions';

    const joinButton = document.createElement('button');
    joinButton.type = 'button';
    joinButton.className = 'action-button';
    joinButton.textContent = isFull ? 'Meeting full' : 'Join meeting';
    joinButton.disabled = isFull;
    joinButton.addEventListener('click', async () => {
      const normalizedEmail = String(currentUser.email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        window.alert('Please log in before joining a meeting so the invite can be sent to your account email.');
        window.location.href = 'auth.html';
        return;
      }
      if (normalizedEmail === 'support@createnconnect.host') {
        window.alert('Please log in with the attendee account. The support email is only used as the sender.');
        window.location.href = 'auth.html';
        return;
      }
      if (meeting.attendees.includes(normalizedEmail)) {
        window.alert('Your account is already signed up for this meeting.');
        return;
      }
      if (meeting.attendees.length >= meeting.capacity) {
        window.alert('This meeting filled up before your request was submitted.');
        return;
      }

      try {
        const emailResult = await apiFetchJSON('/api/meetings/email-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipientEmail: normalizedEmail,
            recipientName: currentUser.name || 'Creator',
            meetingTitle: meeting.title,
            meetingType: meeting.type,
            meetingRegion: meeting.region,
            meetingDateTimeLabel: formatDateTime(meeting.dateTime),
            meetingLocation: meeting.location,
            meetingDescription: meeting.description,
            zoomLink: meeting.zoomLink
          })
        });

        meetings = meetings.map((item) => {
          if (item.id !== meeting.id) return item;

          return {
            ...item,
            attendees: [...item.attendees, normalizedEmail]
          };
        });

        persistMeetings();
        renderMeetings();

        if (emailResult.delivered) {
          window.alert(`Meeting details and the Zoom link were sent to ${normalizedEmail}.`);
        } else {
          window.alert('You joined the meeting, but email delivery is not configured yet on this local server.');
        }
      } catch (error) {
        window.alert(error.message);
      }
    });

    const details = document.createElement('p');
    details.className = `meeting-status${isFull ? ' full' : ''}`;
    details.textContent = isFull
      ? 'This meeting is currently full.'
      : `${remainingSeats} spots left. Your saved account email will receive the invite when you join.`;

    const viewLink = document.createElement('button');
    viewLink.type = 'button';
    viewLink.className = 'ghost-button';
    viewLink.textContent = 'Zoom';
    viewLink.addEventListener('click', () => {
      window.alert(`Generated meeting link:\n${meeting.zoomLink}`);
    });

    actions.append(joinButton, viewLink, details);
    card.appendChild(actions);
    meetingList.appendChild(card);
  });
}

function getFilteredCommunities() {
  if (selectedRegion === 'All') return communities;
  return communities.filter((community) => community.region === selectedRegion);
}

function getFilteredMeetings() {
  if (selectedRegion === 'All') return meetings;
  return meetings.filter((meeting) => meeting.region === selectedRegion);
}

function persistMeetings() {
  localStorage.setItem(meetingStorageKey, JSON.stringify(meetings));
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function getCurrentUser() {
  const user = readStorage('currentUser', null);
  if (user && user.email) {
    return {
      name: user.name || 'Creator',
      email: String(user.email).trim().toLowerCase()
    };
  }

  const legacyProfile = readStorage(profileStorageKey, null);
  const legacyEmail = String(legacyProfile?.email || '').trim().toLowerCase();
  if (legacyEmail && legacyEmail !== 'user@example.com') {
    return {
      name: legacyProfile.name || 'Creator',
      email: legacyEmail
    };
  }

  return {
    name: '',
    email: ''
  };
}

function createZoomLink() {
  const meetingNumber = Math.floor(100000000 + Math.random() * 900000000);
  return `https://zoom.us/j/${meetingNumber}`;
}

function formatDateTime(dateTimeValue) {
  if (!dateTimeValue) return 'Schedule TBD';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateTimeValue));
}

function formatShortTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function setChatEnabled(enabled) {
  const chatInput = chatForm.querySelector('input[name="message"]');
  const chatButton = chatForm.querySelector('button[type="submit"]');
  chatInput.disabled = !enabled;
  chatButton.disabled = !enabled;
}

function setCommunityFormsEnabled(enabled) {
  communityForm.querySelectorAll('input, select, textarea, button').forEach((control) => {
    control.disabled = !enabled;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
