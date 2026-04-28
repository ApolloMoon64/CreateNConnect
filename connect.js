const communityStorageKey = 'connect-page-communities';
const meetingStorageKey = 'connect-page-meetings';
const profileStorageKey = 'connect-page-profile';

const themeStyles = {
  sunrise: 'linear-gradient(135deg, #ffb36b, #ff6f47)',
  ocean: 'linear-gradient(135deg, #56c6ff, #356dff)',
  forest: 'linear-gradient(135deg, #74d39a, #29795b)',
  midnight: 'linear-gradient(135deg, #7261ff, #1f2855)'
};

const defaultCommunities = [
  {
    id: crypto.randomUUID(),
    name: 'Makers Lounge',
    category: 'Digital Art',
    region: 'North America',
    description: 'A daily chat for digital creators sharing works in progress, critique requests, and resource drops.',
    joined: true,
    messages: [
      { id: crypto.randomUUID(), author: 'Avery', text: 'Tonight we are comparing illustration workflows at 7:00 PM.', time: '9:10 AM' },
      { id: crypto.randomUUID(), author: 'Mina', text: 'I uploaded a fresh brush pack in the pinned resources channel.', time: '9:14 AM' }
    ]
  },
  {
    id: crypto.randomUUID(),
    name: 'Poetry Circle',
    category: 'Poetry',
    region: 'Europe',
    description: 'Weekly writing sprints, open mic planning, and feedback swaps for poets at any level.',
    joined: false,
    messages: [
      { id: crypto.randomUUID(), author: 'Luca', text: 'The next open mic signup sheet is now live.', time: '8:40 AM' }
    ]
  },
  {
    id: crypto.randomUUID(),
    name: 'Crochet Commons',
    category: 'Crochet',
    region: 'Asia',
    description: 'Pattern help, yarn sourcing tips, and virtual stitch sessions across time zones.',
    joined: false,
    messages: [
      { id: crypto.randomUUID(), author: 'Rin', text: 'A beginner granny square workshop starts this weekend.', time: '7:55 AM' }
    ]
  }
];

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

let communities = readStorage(communityStorageKey, defaultCommunities);
let meetings = readStorage(meetingStorageKey, defaultMeetings);
let currentUser = getCurrentUser();
let selectedRegion = 'All';
let activeCommunityId = (communities.find((community) => community.joined) || communities[0])?.id;

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

renderAll();
bindEvents();

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

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(chatForm);
    const message = String(formData.get('message') || '').trim();
    if (!message) return;

    communities = communities.map((community) => {
      if (community.id !== activeCommunityId) return community;

      return {
        ...community,
        messages: [
          ...community.messages,
          {
            id: crypto.randomUUID(),
            author: 'You',
            text: message,
            time: formatShortTime(new Date())
          }
        ]
      };
    });

    persistCommunities();
    renderCommunities();
    renderChat();
    chatForm.reset();
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

  communityForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(communityForm);
    const newCommunity = {
      id: crypto.randomUUID(),
      name: String(formData.get('name')).trim(),
      category: String(formData.get('category')).trim(),
      region: String(formData.get('region')).trim(),
      description: String(formData.get('description')).trim(),
      joined: true,
      messages: [
        {
          id: crypto.randomUUID(),
          author: 'System',
          text: 'Welcome to the new community. Start the conversation and invite collaborators.',
          time: formatShortTime(new Date())
        }
      ]
    };

    communities = [newCommunity, ...communities];
    activeCommunityId = newCommunity.id;
    persistCommunities();

    communityForm.reset();
    communityFormStatus.textContent = `Created "${newCommunity.name}" and opened its community chat.`;
    renderCommunities();
    renderGroups();
    renderChat();
  });

  quickCreateGroup.addEventListener('click', () => {
    communityForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    communityForm.querySelector('input[name="name"]').focus();
  });
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

  if (!visibleCommunities.some((community) => community.id === activeCommunityId)) {
    activeCommunityId = visibleCommunities[0].id;
  }

  setChatEnabled(true);
  activeCommunityName.textContent = communities.find((community) => community.id === activeCommunityId)?.name || 'Community chat';

  communityList.innerHTML = '';
  visibleCommunities.forEach((community) => {
    const card = document.createElement('article');
    card.className = `community-card${community.id === activeCommunityId ? ' active' : ''}`;
    card.innerHTML = `
      <h3>${community.name}</h3>
      <div class="community-meta">
        <span class="pill">${community.category}</span>
        <span class="pill">${community.region}</span>
      </div>
      <p>${community.description}</p>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = community.id === activeCommunityId ? 'Open now' : 'Open chat';
    button.addEventListener('click', () => {
      activeCommunityId = community.id;
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
      <h3>${community.name}</h3>
      <div class="group-meta">
        <span class="pill">${community.category}</span>
        <span class="pill">${community.region}</span>
        <span class="pill">${community.messages.length} messages</span>
      </div>
      <p>${community.description}</p>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = community.joined ? 'Open community' : 'Join community';
    button.addEventListener('click', () => {
      communities = communities.map((item) =>
        item.id === community.id ? { ...item, joined: true } : item
      );
      activeCommunityId = community.id;
      persistCommunities();
      renderCommunities();
      renderGroups();
      renderChat();
    });

    card.appendChild(button);
    groupGrid.appendChild(card);
  });
}

function renderChat() {
  const activeCommunity = communities.find((community) => community.id === activeCommunityId);

  if (!activeCommunity || (selectedRegion !== 'All' && activeCommunity.region !== selectedRegion)) {
    chatThread.innerHTML = '<p class="muted-copy">Join a community in this region to start messaging.</p>';
    activeCommunityName.textContent = 'Community chat';
    setChatEnabled(false);
    return;
  }

  setChatEnabled(true);
  activeCommunityName.textContent = activeCommunity.name;
  chatThread.innerHTML = '';

  activeCommunity.messages.forEach((message) => {
    const bubble = document.createElement('article');
    bubble.className = `message-bubble${message.author === 'You' ? ' self' : ''}`;
    bubble.innerHTML = `
      <div class="message-head">
        <strong>${message.author}</strong>
        <span>${message.time}</span>
      </div>
      <p>${message.text}</p>
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

function persistCommunities() {
  localStorage.setItem(communityStorageKey, JSON.stringify(communities));
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
