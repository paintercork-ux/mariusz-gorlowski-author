// Privacy-enhanced YouTube player: no third-party request until intentional click.
function loadVideo(button) {
  const id = button.dataset.video;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
  const frame = document.createElement('iframe');
  frame.title = button.dataset.title || 'YouTube video';
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;
  const stage = button.closest('.ap-video-stage');
  stage.replaceChildren(frame);
  frame.focus();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button.ap-play');
  if (button) loadVideo(button);
});

