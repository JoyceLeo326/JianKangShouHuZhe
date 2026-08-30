const releaseTargets = document.querySelectorAll('[data-release-target]');
const installButtons = document.querySelectorAll('[data-install-app]');
const installDialog = document.querySelector('[data-install-dialog]');
const siteHeader = document.querySelector('[data-site-header]');
const networkStatus = document.querySelector('[data-network-status]');
let installPrompt = null;

function setDownloadLink(link, url) {
  if (!link) return;
  if (url) {
    link.href = url;
    link.removeAttribute('aria-disabled');
    link.setAttribute('rel', 'noopener');
    return;
  }
  link.removeAttribute('href');
  link.setAttribute('aria-disabled', 'true');
}

function hydrateReleaseTarget(target, metadata, version) {
  target.querySelector('[data-release-version]').textContent = `v${version}`;
  target.querySelector('[data-release-file]').textContent = metadata.fileName || '文件名待发布';
  const sha = metadata.sha256 && /^[a-f\d]{64}$/i.test(metadata.sha256)
    ? `SHA256 ${metadata.sha256.toLowerCase()}`
    : 'SHA256 将随文件发布';
  target.querySelector('[data-release-sha]').textContent = sha;
  setDownloadLink(target.querySelector('.download-primary'), metadata.primaryUrl);
  setDownloadLink(target.querySelector('.download-fallback'), metadata.fallbackUrl);
}

async function loadReleaseManifest() {
  try {
    const response = await fetch('./release-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`release manifest returned ${response.status}`);
    const manifest = await response.json();
    releaseTargets.forEach((target) => {
      const platform = target.dataset.releaseTarget;
      const metadata = manifest.downloads?.[platform];
      if (metadata) hydrateReleaseTarget(target, metadata, manifest.version);
    });
  } catch (error) {
    console.warn('Release metadata is temporarily unavailable.', error);
  }
}

function updateNetworkStatus() {
  if (!networkStatus) return;
  networkStatus.textContent = navigator.onLine
    ? '当前在线；已访问过的应用资源会保留在设备缓存中'
    : '当前离线；正在使用此设备中已缓存的内容';
}

function setInstallButtonsVisible(visible) {
  installButtons.forEach((button) => {
    button.hidden = !visible;
  });
}

function openInstallHelp() {
  if (typeof installDialog?.showModal === 'function') {
    installDialog.showModal();
  } else {
    window.location.assign('/app/');
  }
}

installButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    if (!installPrompt) {
      openInstallHelp();
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    setInstallButtonsVisible(false);
  });
});

document.querySelector('[data-close-install]')?.addEventListener('click', () => installDialog?.close());
installDialog?.addEventListener('click', (event) => {
  if (event.target === installDialog) installDialog.close();
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  setInstallButtonsVisible(true);
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  setInstallButtonsVisible(false);
});

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('scroll', () => {
  siteHeader?.classList.toggle('is-scrolled', window.scrollY > 18);
}, { passive: true });

const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isMobileBrowser = window.matchMedia('(max-width: 720px)').matches;
if (isMobileBrowser && !isStandalone) setInstallButtonsVisible(true);

updateNetworkStatus();
loadReleaseManifest();
