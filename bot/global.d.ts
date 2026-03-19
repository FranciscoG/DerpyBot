interface DubAPI {
  allUsers: { [key: string]: DerpyUser };
  log: (type: 'error' | 'info', name: string, message: string) => void;
  leaderboard: { [key: string]: LeaderboardEntry };
  sendChat: (message: string) => void;
  on: (event: string, callback: (data: any) => void) => void;
  events: { [key: string]: string };
  moderateSkip: (cb: () => void) => void;
  getDJ: () => DubAPIUser;
  updub: () => void;

  myconfig: typeof import('./config');
  getRoomHistory: typeof import('./extend/getRoomHistory');
  addToPlaylist: typeof import('./extend/addToPlaylist');
  getPlaylists: typeof import('./extend/getPlaylists');
  shufflePlaylist: typeof import('./extend/shufflePlaylist');
  getUserQueue: typeof import('./extend/getUserQueue');
  DM: typeof import('./extend/directMessages');
  _: {
    connected: boolean;
    room?: { id?: string };
    reqHandler: {
      queue(
        request: { method: string, url: string },
        callback: (code: number, body: { data: any }) => void
      ): void
    }
  };
  emit: (event: string, error: Error) => void;
}

interface DubAPIUser {
  username: string;
}

interface DerpyUser {
  DateAdded: string;
  LastConnected: number;
  flow: number;
  id: number;
  introduced: boolean;
  isPlugDJ: boolean;
  logType: string;
  pp: number;
  props: number;
  username: string;
}

interface LeaderboardEntry {
  flow: string;
  flowObj: { [key: string]: number };
  month: string;
  props: string;
  propsObj: { [key: string]: number };
  year: string;
}

interface Trigger {
  // the oldest version of triggers only had these 3 properties
  Author: string
  Returns: string;
  Trigger: string;

  createdBy?: string;
  createdOn?: number;
  status?: string;
  givesProp?: boolean;
  lastUpdated?: number;
  propsEmoji?: string;
  givesFlow?: boolean;
  flowEmoji?: string;
}

interface Song {
  songid: string;
  played: number;
  _user: { username: string };
  _song: { name: string };
  raw: {
    song: {
      played: number;
    };
  };
  user: { username: string };
  media: { id: string; name: string };
}

interface SongHistory {
  songid: string;
  played: number;
  skipped?: boolean;
  _user: {
    username: string;
  };
  _song: {
    name: string;
    fkid: string;
    type: string;
  };
}