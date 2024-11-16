export function parseRepoLink(repoLink) {
  let cleanedLink = repoLink.replace('https://github.com/', '');
  cleanedLink = cleanedLink.split('/').slice(0, 2).join('/');
  const [owner, name] = cleanedLink.split('/');
  return { owner, name };
}
