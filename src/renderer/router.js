export function parseRoute(hash) {
  const cleaned = (hash || '#/dashboard').replace(/^#/, '');
  const [path] = cleaned.split('?');
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'classes') {
    return { name: 'classes', params: {} };
  }
  if (segments[0] === 'tools') {
    return { name: 'tools', params: {} };
  }
  if (segments[0] === 'settings') {
    return { name: 'settings', params: {} };
  }
  if (segments[0] === 'assignment' && segments[1]) {
    return { name: 'assignment', params: { assignmentId: Number(segments[1]) } };
  }
  return { name: 'dashboard', params: {} };
}

export function href(routeName, params = {}) {
  if (routeName === 'assignment') {
    return `#/assignment/${params.assignmentId}`;
  }
  return `#/${routeName}`;
}
