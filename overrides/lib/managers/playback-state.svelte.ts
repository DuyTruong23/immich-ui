/**
 * Session-level playback state for the asset viewer.
 * Survives video component swaps and asset navigation within one viewer session.
 */
class PlaybackStateManager {
  muted = $state(true);
  volume = $state(1);
  playbackRate = $state(1);
  /** User explicitly enabled audio — try unmuted autoplay on subsequent videos. */
  userHasEnabledAudio = $state(false);

  applyTo(video: HTMLVideoElement, isMobile = false) {
    video.volume = this.volume;
    video.playbackRate = this.playbackRate;
    video.muted = this.initialMutedForAutoplay(isMobile);
  }

  syncFrom(video: HTMLVideoElement) {
    this.volume = video.volume;
    this.playbackRate = video.playbackRate;
    this.muted = video.muted;
    if (!video.muted) {
      this.userHasEnabledAudio = true;
    }
  }

  /** Initial mobile autoplay policy: start muted until user unmutes. */
  initialMutedForAutoplay(isMobile: boolean): boolean {
    if (this.userHasEnabledAudio) {
      return this.muted;
    }
    return isMobile || this.muted;
  }

  reset() {
    this.muted = true;
    this.volume = 1;
    this.playbackRate = 1;
    this.userHasEnabledAudio = false;
  }
}

export const playbackStateManager = new PlaybackStateManager();
