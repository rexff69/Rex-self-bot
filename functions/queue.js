class Queue {
  constructor() {
    this.queues = new Map();
  }

  get(guildId) { return this.queues.get(guildId); }

  create(guildId) {
    const queue = {
      songs: [],
      history: [],
      nowPlaying: null,
      volume: 100,
      filters: {},
      paused: false,
      position: 0,
      lastUpdate: null,
      textChannel: null,
    };
    this.queues.set(guildId, queue);
    return queue;
  }

  delete(guildId) { this.queues.delete(guildId); }

  addSong(guildId, song) {
    const q = this.get(guildId);
    if (q) q.songs.push(song);
  }

  getNext(guildId) {
    const q = this.get(guildId);
    if (q && q.songs.length > 0) return q.songs.shift();
    return null;
  }

  clear(guildId) {
    const q = this.get(guildId);
    if (q) q.songs = [];
  }

  getAll() { return this.queues; }
}

export default new Queue();
