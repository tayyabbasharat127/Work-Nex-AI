export const formatJoiningDate = (value) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatTenure = (value) => {
  if (!value) return null;
  const months = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  if (months < 1) return 'Joined this month';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} at company`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years} year${years === 1 ? '' : 's'}${rem ? ` ${rem} mo` : ''} at company`;
};
