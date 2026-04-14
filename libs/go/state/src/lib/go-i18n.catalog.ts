const EN_CORE = {
  'app.title': 'gx.go',
  'locale.switcher.label': 'Language',
  'common.player.black': 'Black',
  'common.player.white': 'White',
  'common.seat.black': 'black seat',
  'common.seat.white': 'white seat',
  'common.role.host': 'Host',
  'common.role.spectator': 'Spectator',
  'common.status.online': 'Online',
  'common.status.offline': 'Offline',
  'common.status.muted': 'muted',
  'common.mode.go': 'Go',
  'common.mode.gomoku': 'Gomoku',
  'common.move.pass': 'Pass',
  'common.move.resign': 'Resign',
  'common.action.close': 'Close',
} as const;

const EN_GAME = {
  'game.error.intersection_occupied': 'That intersection is already occupied.',
  'game.result.draw': 'The match ends in a draw.',
  'game.result.win_by_points': '{{winner}} wins by {{margin}} points.',
  'game.result.win_by_resignation': '{{winner}} wins by resignation.',
  'game.state.next_turn': '{{player}} to move.',
  'game.go.state.opening': 'Black to move. Place the opening stone.',
  'game.go.state.group_restored': '{{player}} group restored for scoring.',
  'game.go.state.group_marked_dead': '{{player}} group marked dead for scoring.',
  'game.go.state.captured_stones': '{{player}} captured {{count}} stone(s).',
  'game.go.state.scoring_started':
    'Scoring phase started. Click groups to mark them dead, then finalize the result.',
  'game.go.state.next_turn_after_pass': '{{player}} to move after the pass.',
  'game.go.error.match_closed': 'This Go match is no longer accepting moves.',
  'game.go.error.suicide': 'Suicide is not legal in this ruleset.',
  'game.go.error.ko_repeat':
    'Ko prevents an immediate repetition of the previous position.',
  'game.gomoku.state.opening': 'Black to move. Build five in a row to win.',
  'game.gomoku.result.five_in_row': '{{winner}} wins with five in a row.',
  'game.gomoku.result.board_full_draw':
    'The board is full. The match ends in a draw.',
  'game.gomoku.error.match_closed': 'This Gomoku match is already complete.',
  'game.gomoku.error.pass_unavailable': 'Passing is not available in Gomoku.',
  'local.play.error.start_before_place':
    'Start a local match before placing stones.',
  'local.play.error.scoring_preview_unavailable':
    'Unable to update the scoring preview.',
  'local.play.error.start_before_finalize_scoring':
    'Start a local match before finalizing scoring.',
  'local.play.error.finalize_scoring_unavailable':
    'Scoring finalization is only available during a Go scoring phase.',
  'local.play.error.finalize_score_failed': 'Unable to finalize this score.',
  'local.play.error.start_before_move':
    'Start a local match before making a move.',
  'local.play.error.move_rejected': 'Move rejected.',
} as const;

const EN_ROOM_SHARED = {
  'room.error.too_many_create_attempts':
    'Too many room creation attempts. Please try again shortly.',
  'room.error.too_many_join_attempts':
    'Too many room join attempts. Please wait a moment and try again.',
  'room.error.seat_already_claimed': 'That seat is already claimed.',
  'room.error.no_player_seat': 'You do not currently occupy a player seat.',
  'room.error.match_must_finish':
    'The current match must finish before a new one can start.',
  'room.error.both_seats_required':
    'Both black and white seats must be claimed before starting a match.',
  'room.error.spectators_cannot_play': 'Spectators cannot submit game commands.',
  'room.error.dead_group_toggle_unavailable':
    'Dead-group toggling is only available during Go scoring.',
  'room.error.scoring_preview_unavailable':
    'Unable to update scoring preview.',
  'room.error.score_finalization_unavailable':
    'Score finalization is only available during Go scoring.',
  'room.error.finalize_scoring_failed': 'Unable to finalize scoring.',
  'room.error.match_not_accepting_moves':
    'The match is not accepting new moves.',
  'room.error.not_your_turn': 'It is not your turn.',
  'room.error.resign_only_for_self':
    'Players may only resign on their own behalf.',
  'room.error.move_rejected': 'Move rejected.',
  'room.error.you_are_muted': 'You are muted in this room.',
  'room.error.chat_rate_limited':
    'You are sending chat messages too quickly.',
  'room.error.host_cannot_be_muted': 'The host cannot be muted.',
  'room.error.host_cannot_be_kicked': 'The host cannot be kicked.',
  'room.error.cannot_kick_active_player':
    'Seated players cannot be kicked during an active match.',
  'room.error.not_found': 'Room {{roomId}} was not found.',
  'room.error.no_match_started': 'No hosted match has been started yet.',
  'room.error.invalid_participant_token':
    'Participant token is invalid for this room.',
  'room.error.participant_not_found':
    'Participant was not found in this room.',
  'room.error.host_only_action':
    'Only the room host can perform this action.',
  'room.error.seat_change_while_live':
    'Seats cannot be changed while a match is in progress.',
  'room.error.unsupported_mode': 'Unsupported game mode.',
  'room.error.invalid_go_board_size':
    'Go matches must use a 9x9, 13x13, or 19x19 board.',
  'room.error.invalid_gomoku_board_size':
    'Gomoku matches must use a 15x15 board.',
  'room.error.display_name_required': 'Display name is required.',
  'room.error.display_name_too_long':
    'Display names must be {{max}} characters or fewer.',
  'room.error.chat_required': 'Chat messages cannot be empty.',
  'room.error.chat_too_long':
    'Chat messages must be {{max}} characters or fewer.',
  'room.error.next_match_settings_locked':
    'Next-match settings can only be changed while at least one seat is still open.',
  'room.error.rematch_response_unavailable':
    'There is no active rematch prompt to answer right now.',
  'room.error.rematch_players_only':
    'Only the two seated players from the finished match can answer the rematch prompt.',
  'room.error.rematch_declined_wait_for_seat_change':
    'A seat must change before the room can auto-start another match.',
  'room.error.unexpected_server_error': 'Unexpected server error.',
  'room.notice.seat_moved': '{{displayName}} moved to the {{seat}}.',
  'room.notice.seat_claimed': '{{displayName}} claimed the {{seat}}.',
  'room.notice.seat_released': '{{displayName}} released the {{seat}}.',
  'room.notice.match_started': '{{displayName}} started a {{mode}} match.',
  'room.notice.match_started_auto': 'The next {{mode}} match started automatically.',
  'room.notice.next_match_settings_updated':
    'Next match updated to {{mode}} on a {{size}} x {{size}} board.',
  'room.notice.rematch_declined': '{{displayName}} passed on another game.',
  'room.notice.participant_muted':
    '{{actorDisplayName}} muted {{targetDisplayName}}.',
  'room.notice.participant_unmuted':
    '{{actorDisplayName}} unmuted {{targetDisplayName}}.',
  'room.notice.participant_removed':
    '{{actorDisplayName}} removed {{targetDisplayName}}.',
  'room.validation.display_name_string': 'Display name must be text.',
  'room.validation.participant_token_too_long':
    'Participant tokens must be {{max}} characters or fewer.',
  'room.validation.participant_token_string':
    'Participant token must be text.',
  'room.validation.mode_string': 'Mode must be text.',
  'room.validation.board_size_invalid': 'Board size must be a valid integer.',
  'room.validation.komi_invalid': 'Komi must be within the allowed range.',
  'room.validation.invalid_payload': 'The request payload is invalid.',
  'room.client.join_required': 'Join the room before using room actions.',
  'room.client.realtime_unavailable':
    'Wait for the room connection to finish before using room actions.',
  'room.client.unexpected_network_error': 'Unexpected network error.',
  'lobby.error.load_failed': 'Unable to load hosted rooms.',
} as const;
const EN_MODES = {
  'mode.go.title': 'Go',
  'mode.go.strapline': 'Territory, captures, ko, and endgame scoring',
  'mode.go.description':
    'Classic stone placement with captures, pass/resign actions, and Chinese area scoring after two consecutive passes.',
  'mode.go.objective':
    'Build strong shapes, capture stones when groups lose all liberties, and finish with more area after komi.',
  'mode.go.help.0':
    'Black moves first and may place one stone on any empty intersection.',
  'mode.go.help.1':
    'Groups with no liberties are captured and removed immediately.',
  'mode.go.help.2':
    'Immediate ko recapture is rejected to prevent repeating the previous position.',
  'mode.go.help.3':
    'Two consecutive passes open scoring. During scoring, click groups to mark them dead before finalizing.',
  'mode.go.help.4':
    'Chinese area scoring is used. White receives {{komi}} komi.',
  'mode.go.setup_hint': 'Choose a 9x9, 13x13, or 19x19 board for local play.',
  'mode.gomoku.title': 'Gomoku',
  'mode.gomoku.strapline': 'Fast five-in-a-row on a 15x15 board',
  'mode.gomoku.description':
    'Freestyle Gomoku with alternating turns, occupied-cell rejection, and a win on any horizontal, vertical, or diagonal line of five or more stones.',
  'mode.gomoku.objective':
    'Connect five or more stones in a straight line before your opponent does.',
  'mode.gomoku.help.0': 'The board is fixed to 15x15.',
  'mode.gomoku.help.1':
    'Players alternate placing stones on empty intersections only.',
  'mode.gomoku.help.2': 'Any five-in-a-row or longer line wins immediately.',
  'mode.gomoku.help.3':
    'If the board fills without a winning line, the game ends in a draw.',
  'mode.gomoku.setup_hint':
    'Gomoku uses a fixed 15x15 board in this first release.',
} as const;
const EN_LOCAL_UI = {
  'landing.local_play_tag': 'Local play',
  'landing.title': 'Go and Gomoku, ready at your own pace.',
  'landing.description':
    'Start a local match instantly, or head into the hosted lobby when you want live rooms, spectators, and chat.',
  'landing.open_online_lobby': 'Open online lobby',
  'landing.mode_label': 'Mode: {{mode}}',
  'landing.board_size_badge': 'Boards: {{sizes}}',
  'landing.objective': 'Objective',
  'landing.highlights': 'Highlights',
  'landing.start_local_mode': 'Start local {{mode}}',
  'setup.back_to_modes': 'Back to modes',
  'setup.match_setup': 'Match setup',
  'setup.black_player': 'Black player',
  'setup.white_player': 'White player',
  'setup.board_size': 'Board size',
  'setup.go_komi_note': 'White receives {{komi}} komi.',
  'setup.gomoku_fixed_board': 'Gomoku uses a fixed {{size}} x {{size}} board.',
  'setup.start_local_match': 'Start local match',
  'setup.rules_refresher': 'Rules refresher',
  'play.back_to_setup': 'Back to setup',
  'play.current_turn': 'Current turn',
  'play.scoring_hint':
    'Scoring review is active. Click groups to mark them dead, then finalize the result.',
  'play.rules_and_reminders': 'Rules and reminders',
  'play.match_result': 'Match result',
  'play.restart_match': 'Restart match',
  'play.new_setup': 'New setup',
  'play.play_again_prompt':
    'Want another one with the same players and rules, or would you rather change the setup first?',
  'play.play_again_action': 'Play again',
  'play.change_setup_action': 'Change setup',
  'play.confirm.resign.header': 'Resign match?',
  'play.confirm.resign.message': 'This ends the current match immediately.',
  'play.confirm.resign.accept': 'Resign',
  'play.confirm.resign.reject': 'Keep playing',
  'play.confirm.restart.header': 'Restart this match?',
  'play.confirm.restart.message':
    'The same settings and player names will be used for a fresh game.',
  'play.confirm.restart.accept': 'Restart',
  'play.confirm.restart.reject': 'Cancel',
  'play.confirm.new_setup.header': 'Return to setup?',
  'play.confirm.new_setup.message':
    'This clears the current match and takes you back to setup.',
  'play.confirm.new_setup.accept': 'Go to setup',
  'play.confirm.new_setup.reject': 'Stay here',
  'play.toast.move_rejected': 'Move unavailable',
  'play.toast.pass_unavailable': 'Pass unavailable',
  'play.toast.scoring_unavailable': 'Scoring unavailable',
  'play.toast.resignation_unavailable': 'Resignation unavailable',
  'play.toast.match_restarted.summary': 'Match restarted',
  'play.toast.match_restarted.detail':
    'A fresh game is ready with the same setup.',
  'ui.match_sidebar.go_match': 'Go match',
  'ui.match_sidebar.gomoku_match': 'Gomoku match',
  'ui.match_sidebar.captures': 'Captures: {{count}}',
  'ui.match_sidebar.score_preview': 'Score preview',
  'ui.match_sidebar.pass': 'Pass',
  'ui.match_sidebar.resign': 'Resign',
  'ui.match_sidebar.finalize_score': 'Finalize score',
  'ui.match_sidebar.rules': 'Rules',
  'ui.match_sidebar.restart': 'Restart',
  'ui.match_sidebar.new_match': 'New match',
  'ui.match_sidebar.move_log': 'Move log',
  'ui.match_sidebar.moves_count': '{{count}} moves',
  'ui.match_sidebar.empty_move_log':
    'Moves will appear here once the game begins.',
  'ui.game_status.draw': 'Draw',
  'ui.game_status.win': '{{player}} wins',
  'ui.game_status.scoring_review': 'Scoring review',
  'ui.game_status.turn': '{{player}} to move',
  'ui.game_board.aria_label': '{{mode}} board, {{size}} by {{size}}',
  'ui.stone_badge.aria': '{{player}} stone',
  'hosted.header.description':
    'Jump between the hosted lobby and room views without leaving the Go frontend.',
  'hosted.header.lobby': 'Lobby',
  'hosted.header.start_local_go': 'Start local Go',
  'hosted.header.start_local_gomoku': 'Start local Gomoku',
  'hosted.header.page.room': 'Room view',
  'create.back_to_modes': 'Back to modes',
  'create.eyebrow': 'Hosted multiplayer',
  'create.title': 'Create an online room',
  'create.description':
    'You will become the host, get a shareable room URL, and can invite two players plus any number of spectators.',
  'create.display_name': 'Your display name',
  'create.creating_room': 'Creating room...',
  'create.create_room': 'Create room',
} as const;
const EN_HOSTED_UI = {
  'room.hero.eyebrow': 'Hosted multiplayer room',
  'room.hero.title': 'Room {{roomId}}',
  'room.hero.loading_title': 'Loading room...',
  'room.hero.description':
    'Invite two players to take seats, let spectators watch live, and keep the room chat moving during the match.',
  'room.hero.connection': 'Connection',
  'room.hero.share_url': 'Share URL',
  'room.hero.copy': 'Copy',
  'room.page.back_to_lobby': 'Back to lobby',
  'room.page.loading': 'Loading hosted room state...',
  'room.page.missing.label': 'Room unavailable',
  'room.page.missing.title': 'This room could not be found.',
  'room.page.missing.description':
    'The room may have expired after being empty for too long, or the link may be incorrect.',
  'room.page.missing.action': 'Return to lobby',
  'room.page.live_board': 'Live board',
  'room.page.turn': 'Turn',
  'room.stage.ready.label': 'Ready room',
  'room.stage.ready.title': 'Both seats are filled and the next match is about to auto-start.',
  'room.stage.ready.description':
    'Players are seated, spectators can already chat, and the room will launch the saved next-match settings automatically.',
  'room.stage.blocked.label': 'Lineup paused',
  'room.stage.blocked.title': 'A seat change is needed before auto-start resumes.',
  'room.stage.blocked.description':
    'The last rematch was declined. Release or change a seat to unlock the next automatic start.',
  'room.stage.waiting.label': 'Waiting room',
  'room.stage.waiting.title': 'Open seats are still available.',
  'room.stage.waiting.description':
    'Players can claim black and white while the host tunes the next-match settings and spectators keep the room chat moving.',
  'room.join.title.spectator': 'Join as spectator',
  'room.join.title.pre_match': 'Enter as a spectator or player',
  'room.join.description.spectator':
    'Live rooms are watch-and-chat only until the current match ends.',
  'room.join.description.pre_match':
    'Pick a display name to join the room before claiming a seat or chatting.',
  'room.connection.connected': 'Connected',
  'room.connection.connecting': 'Connecting',
  'room.connection.reconnecting': 'Reconnecting',
  'room.connection.offline': 'Offline',
  'room.chat.helper.join': 'Join the room to chat.',
  'room.chat.helper.muted': 'The host muted your chat access.',
  'room.chat.helper.default': 'Spectators and players can chat in real time.',
  'room.participants.join_room': 'Join room',
  'room.participants.display_name': 'Display name',
  'room.participants.joining_room': 'Joining room...',
  'room.participants.you_are_here_as': 'You are here as',
  'room.participants.seats': 'Seats',
  'room.participants.players_and_spectators': 'Players and spectators',
  'room.participants.open_seat': 'Open seat',
  'room.participants.claim': 'Claim',
  'room.participants.release': 'Release',
  'room.participants.mute': 'Mute',
  'room.participants.unmute': 'Unmute',
  'room.participants.kick': 'Kick',
  'room.participants.host_controls': 'Host controls',
  'room.participants.mode': 'Mode',
  'room.participants.board_size': 'Board size',
  'room.participants.match_actions': 'Match actions',
  'room.participants.finalize_score': 'Finalize score',
  'room.participants.move_log': 'Move log',
  'room.participants.empty_move_log':
    'Moves will appear here once the game begins.',
  'room.participants.viewer_role.player': '{{player}} player',
  'room.next_match.eyebrow': 'Next up',
  'room.next_match.title': 'Next match settings',
  'room.next_match.description':
    'These saved settings are used whenever the room auto-starts another game.',
  'room.next_match.save': 'Save next match',
  'room.next_match.locked.rematch':
    'Settings are locked while the rematch prompt is waiting for player responses.',
  'room.next_match.locked.live':
    'Settings unlock again after the current live match finishes.',
  'room.next_match.locked.filled':
    'Settings lock as soon as both seats are filled and the room is ready to auto-start.',
  'room.rematch.eyebrow': 'Rematch',
  'room.rematch.title': 'Play another one?',
  'room.rematch.description.player':
    'Both seated players need to answer before the room can auto-start the next game.',
  'room.rematch.description.spectator':
    'Only the two seated players can answer. Everyone else can watch the responses come in.',
  'room.rematch.accept': 'Play again',
  'room.rematch.decline': 'Not now',
  'room.rematch.response.pending': 'Waiting',
  'room.rematch.response.accepted': 'Ready',
  'room.rematch.response.declined': 'Passed',
  'room.rematch.blocked':
    'A player passed on the rematch. Change a seat to unlock auto-start for the next game.',
  'room.chat.title': 'Room chat',
  'room.chat.empty': 'Join the room to start the conversation.',
  'room.chat.message': 'Message',
  'room.chat.placeholder': 'Message the room...',
  'room.chat.send': 'Send',
  'lobby.hero.eyebrow': 'Hosted multiplayer lobby',
  'lobby.hero.title': 'Go and Gomoku rooms, ready to join.',
  'lobby.hero.description':
    'Start in the lobby, pick the room that fits the moment, and move straight into chat without hunting through extra screens.',
  'lobby.hero.flow': 'Flow',
  'lobby.hero.flow.0': 'Browse rooms by live, ready, or waiting status.',
  'lobby.hero.flow.1': 'Enter your display name once.',
  'lobby.hero.flow.2':
    'Create a room or quick-join the selected room for chat.',
  'lobby.loading': 'Loading hosted rooms...',
  'lobby.empty.label': 'No active rooms',
  'lobby.empty.title': 'The hosted lobby is clear right now.',
  'lobby.empty.description':
    'Create the next room below and it will become the first place players can jump into chat.',
  'lobby.section.live.title': 'Live rooms',
  'lobby.section.live.caption':
    'Games in progress stay open for spectators who want to watch and chat.',
  'lobby.section.ready.title': 'Ready rooms',
  'lobby.section.ready.caption':
    'These rooms already have two players seated and will auto-start with their saved next-match settings.',
  'lobby.section.waiting.title': 'Waiting rooms',
  'lobby.section.waiting.caption':
    'Open seats are still available, so these are the best rooms for fresh players to join.',
  'lobby.section.empty': 'No {{section}} yet.',
  'lobby.status.live': 'Live',
  'lobby.status.ready': 'Ready',
  'lobby.status.waiting': 'Waiting',
  'lobby.room.status.live.headline':
    'Watch the live board and join chat as a spectator.',
  'lobby.room.status.live.copy':
    'Joining from the lobby takes you straight into spectator chat while the active game stays locked.',
  'lobby.room.status.ready.headline':
    'Players are seated and the room is primed to auto-start the next match.',
  'lobby.room.status.ready.copy':
    'Enter the room to chat, confirm the saved settings, or watch the automatic start and rematch flow.',
  'lobby.room.status.waiting.headline':
    'Join the room, claim a seat inside, and get the next match moving.',
  'lobby.room.status.waiting.copy':
    'Enter the room first, then claim black or white from the in-room seat controls.',
  'lobby.room.mode_pending':
    'Mode and board size are chosen in-room before the match begins.',
  'lobby.room.mode_with_board': '{{mode}} on a {{size}} x {{size}} board',
  'lobby.room.action.live': 'Watch and chat live',
  'lobby.room.action.join': 'Join selected room',
  'lobby.room.action_hint.live':
    'You will enter as a spectator while the match is live.',
  'lobby.room.action_hint.join':
    'Seat claims and host controls stay inside the room after you join.',
  'lobby.room.open_seat': 'Open {{seat}}',
  'lobby.room.card.title': "{{host}}'s room",
  'lobby.room.card.label': 'Room {{roomId}}',
  'lobby.room.selected': 'Selected',
  'lobby.identity.label': 'Your identity',
  'lobby.identity.title': 'Enter your name once',
  'lobby.identity.description':
    'The same display name is reused when you create a room or join the one you selected from the lobby.',
  'lobby.identity.display_name': 'Display name',
  'lobby.identity.create_room': 'Create room',
  'lobby.identity.creating_room': 'Creating room...',
  'lobby.selected.label': 'Selected room',
  'lobby.selected.open_room_details': 'Open room details',
  'lobby.selected.updated': 'Updated {{time}}',
  'lobby.selected.placeholder.title': 'Pick a room once one appears',
  'lobby.selected.placeholder.description':
    'The quick-join panel fills in automatically as soon as the lobby has an active room to select.',
  'lobby.count.room.one': '{{count}} room',
  'lobby.count.room.other': '{{count}} rooms',
  'lobby.count.person.one': '{{count}} person',
  'lobby.count.person.other': '{{count}} people',
  'lobby.count.online.one': '{{count}} online',
  'lobby.count.online.other': '{{count}} online',
  'lobby.count.spectator.one': '{{count}} spectator',
  'lobby.count.spectator.other': '{{count}} spectators',
} as const;

const EN_TRANSLATIONS = {
  ...EN_CORE,
  ...EN_GAME,
  ...EN_ROOM_SHARED,
  ...EN_MODES,
  ...EN_LOCAL_UI,
  ...EN_HOSTED_UI,
} as const;

export type GoTranslationKey = keyof typeof EN_TRANSLATIONS;

const ZH_CORE = {
  'app.title': 'gx.go',
  'locale.switcher.label': '語言',
  'common.player.black': '黑方',
  'common.player.white': '白方',
  'common.seat.black': '黑方座位',
  'common.seat.white': '白方座位',
  'common.role.host': '房主',
  'common.role.spectator': '觀戰者',
  'common.status.online': '在線',
  'common.status.offline': '離線',
  'common.status.muted': '已禁言',
  'common.mode.go': '圍棋',
  'common.mode.gomoku': '五子棋',
  'common.move.pass': '虛手',
  'common.move.resign': '認輸',
  'common.action.close': '關閉',
} as const;

const ZH_GAME = {
  'game.error.intersection_occupied': '該交叉點已經有棋子了。',
  'game.result.draw': '本局以和局結束。',
  'game.result.win_by_points': '{{winner}}以 {{margin}} 目獲勝。',
  'game.result.win_by_resignation': '{{winner}}因對手認輸而獲勝。',
  'game.state.next_turn': '輪到{{player}}落子。',
  'game.go.state.opening': '輪到黑方落子。請下第一手。',
  'game.go.state.group_restored': '{{player}}棋群已恢復為活棋。',
  'game.go.state.group_marked_dead': '{{player}}棋群已標記為死棋。',
  'game.go.state.captured_stones': '{{player}}提掉了 {{count}} 顆棋子。',
  'game.go.state.scoring_started':
    '已進入算地階段。點擊棋群標記死子後，再確認最終結果。',
  'game.go.state.next_turn_after_pass': '{{player}}在虛手後輪到落子。',
  'game.go.error.match_closed': '這盤圍棋目前已無法再落子。',
  'game.go.error.suicide': '這個規則集不允許自殺棋。',
  'game.go.error.ko_repeat': '打劫規則禁止立刻重複上一個局面。',
  'game.gomoku.state.opening': '輪到黑方落子，先連成五子者獲勝。',
  'game.gomoku.result.five_in_row': '{{winner}}連成五子而獲勝。',
  'game.gomoku.result.board_full_draw': '棋盤已滿，本局和棋。',
  'game.gomoku.error.match_closed': '這盤五子棋已經結束。',
  'game.gomoku.error.pass_unavailable': '五子棋不允許虛手。',
  'local.play.error.start_before_place': '請先開始本機對局，再放置棋子。',
  'local.play.error.scoring_preview_unavailable': '無法更新算地預覽。',
  'local.play.error.start_before_finalize_scoring':
    '請先開始本機對局，再確認算地。',
  'local.play.error.finalize_scoring_unavailable':
    '只有在圍棋的算地階段才能確認結果。',
  'local.play.error.finalize_score_failed': '無法確認目前算地結果。',
  'local.play.error.start_before_move': '請先開始本機對局，再進行操作。',
  'local.play.error.move_rejected': '此步無法落子。',
} as const;

const ZH_ROOM_SHARED = {
  'room.error.too_many_create_attempts':
    '建立房間的次數過多，請稍後再試。',
  'room.error.too_many_join_attempts':
    '加入房間的次數過多，請稍後再試。',
  'room.error.seat_already_claimed': '該座位已被認領。',
  'room.error.no_player_seat': '你目前不在玩家座位上。',
  'room.error.match_must_finish': '必須先完成目前對局，才能開始新的一局。',
  'room.error.both_seats_required':
    '黑方與白方座位都必須有人後才能開始對局。',
  'room.error.spectators_cannot_play': '觀戰者不能送出對局指令。',
  'room.error.dead_group_toggle_unavailable':
    '只有在圍棋算地階段才能切換死子標記。',
  'room.error.scoring_preview_unavailable': '無法更新算地預覽。',
  'room.error.score_finalization_unavailable':
    '只有在圍棋算地階段才能確認結果。',
  'room.error.finalize_scoring_failed': '無法確認算地結果。',
  'room.error.match_not_accepting_moves': '目前對局不接受新的操作。',
  'room.error.not_your_turn': '現在不是你的回合。',
  'room.error.resign_only_for_self': '玩家只能代表自己認輸。',
  'room.error.move_rejected': '此步無法落子。',
  'room.error.you_are_muted': '你在此房間已被禁言。',
  'room.error.chat_rate_limited': '你發送聊天室訊息的速度太快了。',
  'room.error.host_cannot_be_muted': '房主不能被禁言。',
  'room.error.host_cannot_be_kicked': '房主不能被移出。',
  'room.error.cannot_kick_active_player':
    '對局進行中時，已入座的玩家不能被移出。',
  'room.error.not_found': '找不到房間 {{roomId}}。',
  'room.error.no_match_started': '此房間尚未開始線上對局。',
  'room.error.invalid_participant_token': '此房間的參與者權杖無效。',
  'room.error.participant_not_found': '在此房間中找不到該參與者。',
  'room.error.host_only_action': '只有房主可以執行此操作。',
  'room.error.seat_change_while_live': '對局進行中時不能更換座位。',
  'room.error.unsupported_mode': '不支援的對局模式。',
  'room.error.invalid_go_board_size':
    '圍棋只能使用 9x9、13x13 或 19x19 棋盤。',
  'room.error.invalid_gomoku_board_size':
    '五子棋只能使用 15x15 棋盤。',
  'room.error.display_name_required': '顯示名稱為必填。',
  'room.error.display_name_too_long':
    '顯示名稱長度不可超過 {{max}} 個字元。',
  'room.error.chat_required': '聊天訊息不能為空。',
  'room.error.chat_too_long':
    '聊天訊息長度不可超過 {{max}} 個字元。',
  'room.error.unexpected_server_error': '伺服器發生未預期的錯誤。',
  'room.notice.seat_moved': '{{displayName}}移動到了{{seat}}。',
  'room.notice.seat_claimed': '{{displayName}}已認領{{seat}}。',
  'room.notice.seat_released': '{{displayName}}已釋放{{seat}}。',
  'room.notice.match_started': '{{displayName}}開始了一場{{mode}}對局。',
  'room.notice.participant_muted':
    '{{actorDisplayName}}已將{{targetDisplayName}}設為禁言。',
  'room.notice.participant_unmuted':
    '{{actorDisplayName}}已解除{{targetDisplayName}}的禁言。',
  'room.notice.participant_removed':
    '{{actorDisplayName}}已將{{targetDisplayName}}移出房間。',
  'room.validation.display_name_string': '顯示名稱必須是文字。',
  'room.validation.participant_token_too_long':
    '參與者權杖長度不可超過 {{max}} 個字元。',
  'room.validation.participant_token_string': '參與者權杖必須是文字。',
  'room.validation.mode_string': '模式必須是文字。',
  'room.validation.board_size_invalid': '棋盤大小必須是有效的整數。',
  'room.validation.komi_invalid': '貼目必須在允許範圍內。',
  'room.validation.invalid_payload': '請求內容格式無效。',
  'room.client.join_required': '請先加入房間，再使用房內操作。',
  'room.client.realtime_unavailable': '請先等待房間即時連線完成，再使用房內操作。',
  'room.client.unexpected_network_error': '網路連線發生未預期的錯誤。',
  'lobby.error.load_failed': '無法載入線上房間。',
  'room.error.next_match_settings_locked':
    '至少保留一個空座位時，才能調整下一局設定。',
  'room.error.rematch_response_unavailable': '目前沒有可回應的再來一局提示。',
  'room.error.rematch_players_only':
    '只有剛結束對局的兩位入座玩家可以回應再來一局。',
  'room.error.rematch_declined_wait_for_seat_change':
    '需要先變更座位，房間才能再次自動開始新對局。',
  'room.notice.match_started_auto': '下一場 {{mode}} 對局已自動開始。',
  'room.notice.next_match_settings_updated':
    '下一局已更新為 {{mode}}，棋盤 {{size}} x {{size}}。',
  'room.notice.rematch_declined': '{{displayName}} 這次先不再來一局。',
} as const;
const ZH_MODES = {
  'mode.go.title': '圍棋',
  'mode.go.strapline': '圍地、提子、打劫與終局算地',
  'mode.go.description':
    '經典圍棋玩法，包含提子、虛手與認輸，雙方連續虛手後進入中國數子法算地。',
  'mode.go.objective':
    '建立穩固棋形、在對方棋群沒有氣時提子，並在貼目後取得更大的地盤。',
  'mode.go.help.0': '黑方先行，可在任一空交叉點落下一子。',
  'mode.go.help.1': '沒有氣的棋群會立刻被提掉。',
  'mode.go.help.2': '為避免重複局面，打劫不允許立刻提回。',
  'mode.go.help.3':
    '雙方連續兩次虛手後進入算地。算地時可點擊棋群標記死子，再確認結果。',
  'mode.go.help.4': '使用中國數子法。白方有 {{komi}} 目貼目。',
  'mode.go.setup_hint': '本機對局可選擇 9x9、13x13 或 19x19 棋盤。',
  'mode.gomoku.title': '五子棋',
  'mode.gomoku.strapline': '在 15x15 棋盤上快速連成五子',
  'mode.gomoku.description':
    '自由五子棋玩法，雙方輪流落子，不能下在已有棋子的格點，任一橫直斜方向連成五子以上即獲勝。',
  'mode.gomoku.objective': '在對手之前，先將五顆以上棋子連成一直線。',
  'mode.gomoku.help.0': '棋盤固定為 15x15。',
  'mode.gomoku.help.1': '雙方輪流在空交叉點落子。',
  'mode.gomoku.help.2': '只要連成五子以上即刻獲勝。',
  'mode.gomoku.help.3': '若棋盤下滿仍無人連成五子，則判定和局。',
  'mode.gomoku.setup_hint': '目前版本的五子棋固定使用 15x15 棋盤。',
} as const;
const ZH_LOCAL_UI = {
  'landing.local_play_tag': '本機對局',
  'landing.title': '圍棋與五子棋，隨時開局。',
  'landing.description':
    '想自己練習時可立即開始本機對局，想要即時房間、觀戰與聊天時再前往線上大廳。',
  'landing.open_online_lobby': '開啟線上大廳',
  'landing.mode_label': '模式：{{mode}}',
  'landing.board_size_badge': '棋盤：{{sizes}}',
  'landing.objective': '目標',
  'landing.highlights': '重點',
  'landing.start_local_mode': '開始本機{{mode}}',
  'setup.back_to_modes': '返回模式選擇',
  'setup.match_setup': '對局設定',
  'setup.black_player': '黑方名稱',
  'setup.white_player': '白方名稱',
  'setup.board_size': '棋盤大小',
  'setup.go_komi_note': '白方貼目 {{komi}}。',
  'setup.gomoku_fixed_board': '五子棋固定使用 {{size}} x {{size}} 棋盤。',
  'setup.start_local_match': '開始本機對局',
  'setup.rules_refresher': '規則摘要',
  'play.back_to_setup': '返回設定',
  'play.current_turn': '目前輪到',
  'play.scoring_hint': '目前為算地確認階段。點擊棋群標記死子後，再確認結果。',
  'play.rules_and_reminders': '規則與提醒',
  'play.match_result': '對局結果',
  'play.restart_match': '重新開始',
  'play.new_setup': '重新設定',
  'play.confirm.resign.header': '確定要認輸嗎？',
  'play.confirm.resign.message': '這會立即結束目前對局。',
  'play.confirm.resign.accept': '認輸',
  'play.confirm.resign.reject': '繼續對局',
  'play.confirm.restart.header': '要重新開始這局嗎？',
  'play.confirm.restart.message': '會保留相同設定與玩家名稱，直接開始新局。',
  'play.confirm.restart.accept': '重新開始',
  'play.confirm.restart.reject': '取消',
  'play.confirm.new_setup.header': '返回設定頁？',
  'play.confirm.new_setup.message': '這會清除目前對局並回到設定頁。',
  'play.confirm.new_setup.accept': '前往設定',
  'play.confirm.new_setup.reject': '留在此頁',
  'play.toast.move_rejected': '無法落子',
  'play.toast.pass_unavailable': '目前無法虛手',
  'play.toast.scoring_unavailable': '目前無法確認算地',
  'play.toast.resignation_unavailable': '目前無法認輸',
  'play.toast.match_restarted.summary': '已重新開始對局',
  'play.toast.match_restarted.detail': '已使用相同設定準備好新的一局。',
  'ui.match_sidebar.go_match': '圍棋對局',
  'ui.match_sidebar.gomoku_match': '五子棋對局',
  'ui.match_sidebar.captures': '提子：{{count}}',
  'ui.match_sidebar.score_preview': '算地預覽',
  'ui.match_sidebar.pass': '虛手',
  'ui.match_sidebar.resign': '認輸',
  'ui.match_sidebar.finalize_score': '確認結果',
  'ui.match_sidebar.rules': '規則',
  'ui.match_sidebar.restart': '重新開始',
  'ui.match_sidebar.new_match': '重新配局',
  'ui.match_sidebar.move_log': '著手記錄',
  'ui.match_sidebar.moves_count': '{{count}} 手',
  'ui.match_sidebar.empty_move_log': '對局開始後，這裡會顯示著手記錄。',
  'ui.game_status.draw': '和局',
  'ui.game_status.win': '{{player}}獲勝',
  'ui.game_status.scoring_review': '算地確認',
  'ui.game_status.turn': '輪到{{player}}',
  'ui.game_board.aria_label': '{{mode}}棋盤，{{size}} 乘 {{size}}',
  'ui.stone_badge.aria': '{{player}}棋子',
  'hosted.header.description': '可在 Go 前端中快速切換線上大廳與房間畫面。',
  'hosted.header.lobby': '大廳',
  'hosted.header.start_local_go': '開始本機圍棋',
  'hosted.header.start_local_gomoku': '開始本機五子棋',
  'hosted.header.page.room': '房間檢視',
  'create.back_to_modes': '返回模式選擇',
  'create.eyebrow': '線上多人',
  'create.title': '建立線上房間',
  'create.description':
    '你會成為房主，取得可分享的房間網址，並可邀請兩位玩家和任意數量的觀戰者。',
  'create.display_name': '你的顯示名稱',
  'create.creating_room': '建立房間中...',
  'create.create_room': '建立房間',
  'play.play_again_prompt': '想用同樣的玩家與規則再來一局，還是先調整設定？',
  'play.play_again_action': '再來一局',
  'play.change_setup_action': '調整設定',
} as const;
const ZH_HOSTED_UI = {
  'room.hero.eyebrow': '線上多人房間',
  'room.hero.title': '房間 {{roomId}}',
  'room.hero.loading_title': '房間載入中...',
  'room.hero.description':
    '邀請兩位玩家入座，讓觀戰者即時觀看，並在對局期間持續透過房間聊天互動。',
  'room.hero.connection': '連線狀態',
  'room.hero.share_url': '分享連結',
  'room.hero.copy': '複製',
  'room.page.back_to_lobby': '返回大廳',
  'room.page.loading': '正在載入線上房間狀態...',
  'room.page.missing.label': '房間無法使用',
  'room.page.missing.title': '找不到這個房間。',
  'room.page.missing.description': '房間可能因長時間無人而過期，或是連結不正確。',
  'room.page.missing.action': '返回大廳',
  'room.page.live_board': '即時棋盤',
  'room.page.turn': '輪到',
  'room.stage.ready.label': '可開局',
  'room.stage.ready.title': '玩家已就位，等待房主開始。',
  'room.stage.ready.description':
    '黑白雙方都已入座，觀戰者也能先聊天，房主隨時可以開始下一局。',
  'room.stage.waiting.label': '等待中',
  'room.stage.waiting.title': '仍有空位可加入。',
  'room.stage.waiting.description':
    '玩家可以認領黑白座位，觀戰者也能提早加入並在房內聊天。',
  'room.join.title.spectator': '以觀戰者加入',
  'room.join.title.pre_match': '以玩家或觀戰者加入',
  'room.join.description.spectator': '對局進行中時只能觀戰與聊天，需等本局結束後才能入座。',
  'room.join.description.pre_match': '先輸入顯示名稱加入房間，再認領座位或開始聊天。',
  'room.connection.connected': '已連線',
  'room.connection.connecting': '連線中',
  'room.connection.reconnecting': '重新連線中',
  'room.connection.offline': '離線',
  'room.chat.helper.join': '加入房間後才能聊天。',
  'room.chat.helper.muted': '你的聊天權限已被房主禁言。',
  'room.chat.helper.default': '玩家與觀戰者都可以即時聊天。',
  'room.participants.join_room': '加入房間',
  'room.participants.display_name': '顯示名稱',
  'room.participants.joining_room': '正在加入房間...',
  'room.participants.you_are_here_as': '你目前的身分',
  'room.participants.seats': '座位',
  'room.participants.players_and_spectators': '玩家與觀戰者',
  'room.participants.open_seat': '空位',
  'room.participants.claim': '認領',
  'room.participants.release': '離開',
  'room.participants.mute': '禁言',
  'room.participants.unmute': '解除禁言',
  'room.participants.kick': '移出',
  'room.participants.host_controls': '房主控制',
  'room.participants.start_match': '開始對局',
  'room.participants.finish_current_before_start':
    '請先完成目前對局，再重新安排座位或開始新局。',
  'room.participants.mode': '模式',
  'room.participants.board_size': '棋盤大小',
  'room.participants.start_hosted_match': '開始線上對局',
  'room.participants.match_actions': '對局操作',
  'room.participants.finalize_score': '確認結果',
  'room.participants.move_log': '著手記錄',
  'room.participants.empty_move_log': '對局開始後，這裡會顯示著手記錄。',
  'room.participants.viewer_role.player': '{{player}}玩家',
  'room.chat.title': '房間聊天',
  'room.chat.empty': '加入房間後即可開始聊天。',
  'room.chat.message': '訊息',
  'room.chat.placeholder': '發送訊息給房間...',
  'room.chat.send': '送出',
  'lobby.hero.eyebrow': '線上多人大廳',
  'lobby.hero.title': '圍棋與五子棋房間，隨時可加入。',
  'lobby.hero.description':
    '先從大廳開始，挑選最適合現在情境的房間，再直接進入聊天，不必額外切換畫面。',
  'lobby.hero.flow': '流程',
  'lobby.hero.flow.0': '依照進行中、可開局或等待中狀態瀏覽房間。',
  'lobby.hero.flow.1': '只需輸入一次顯示名稱。',
  'lobby.hero.flow.2': '建立房間，或快速加入已選定的房間開始聊天。',
  'lobby.loading': '正在載入線上房間...',
  'lobby.empty.label': '目前沒有房間',
  'lobby.empty.title': '線上大廳現在是空的。',
  'lobby.empty.description': '在下方建立下一個房間後，它就會成為玩家加入聊天的第一站。',
  'lobby.section.live.title': '進行中房間',
  'lobby.section.live.caption': '對局進行中的房間仍會開放給想觀戰與聊天的使用者。',
  'lobby.section.ready.title': '可開局房間',
  'lobby.section.ready.caption': '黑白雙方都已就位，所有人準備好後房主即可開始對局。',
  'lobby.section.waiting.title': '等待中房間',
  'lobby.section.waiting.caption': '仍有空位可加入，最適合新加入的玩家進房。',
  'lobby.section.empty': '目前還沒有{{section}}。',
  'lobby.status.live': '進行中',
  'lobby.status.ready': '可開局',
  'lobby.status.waiting': '等待中',
  'lobby.room.status.live.headline': '觀戰即時棋盤，並以觀戰者身分加入聊天。',
  'lobby.room.status.live.copy': '從大廳加入後會直接進入觀戰聊天，進行中的對局會保持鎖定。',
  'lobby.room.status.ready.headline': '玩家已入座，所有人準備好後房主即可開始。',
  'lobby.room.status.ready.copy': '進入房間後可聊天、確認對戰陣容，或觀察開局前的準備狀態。',
  'lobby.room.status.waiting.headline': '先加入房間、認領座位，再把下一局帶起來。',
  'lobby.room.status.waiting.copy': '先進入房間，再透過房內座位控制認領黑方或白方。',
  'lobby.room.mode_pending': '模式與棋盤大小會在房間內、開局前決定。',
  'lobby.room.mode_with_board': '{{mode}}，{{size}} x {{size}} 棋盤',
  'lobby.room.action.live': '進入觀戰與聊天',
  'lobby.room.action.join': '加入已選房間',
  'lobby.room.action_hint.live': '對局進行中時，你會以觀戰者身分加入。',
  'lobby.room.action_hint.join': '加入後可在房內認領座位並使用房主控制。',
  'lobby.room.open_seat': '開放{{seat}}',
  'lobby.room.card.title': '{{host}} 的房間',
  'lobby.room.card.label': '房間 {{roomId}}',
  'lobby.room.selected': '已選取',
  'lobby.identity.label': '你的身分',
  'lobby.identity.title': '輸入一次名稱即可',
  'lobby.identity.description': '建立房間或加入大廳中選定的房間時，都會沿用同一個顯示名稱。',
  'lobby.identity.display_name': '顯示名稱',
  'lobby.identity.create_room': '建立房間',
  'lobby.identity.creating_room': '建立房間中...',
  'lobby.selected.label': '已選房間',
  'lobby.selected.open_room_details': '開啟房間詳情',
  'lobby.selected.updated': '更新時間 {{time}}',
  'lobby.selected.placeholder.title': '有房間出現後再選擇',
  'lobby.selected.placeholder.description':
    '只要大廳中出現可選房間，右側的快速加入面板就會自動帶入。',
  'lobby.count.room.one': '{{count}} 個房間',
  'lobby.count.room.other': '{{count}} 個房間',
  'lobby.count.person.one': '{{count}} 人',
  'lobby.count.person.other': '{{count}} 人',
  'lobby.count.online.one': '{{count}} 在線',
  'lobby.count.online.other': '{{count}} 在線',
  'lobby.count.spectator.one': '{{count}} 位觀戰者',
  'lobby.count.spectator.other': '{{count}} 位觀戰者',
  'room.stage.blocked.label': '陣容暫停',
  'room.stage.blocked.title': '需要先變更座位，自動開始才會恢復。',
  'room.stage.blocked.description':
    '上一場再來一局被婉拒了。請先釋放或調整座位，再重新啟用自動開始。',
  'room.next_match.eyebrow': '下一場',
  'room.next_match.title': '下一局設定',
  'room.next_match.description': '房間自動開始新對局時，會使用這組已儲存的設定。',
  'room.next_match.save': '儲存下一局',
  'room.next_match.locked.rematch':
    '再來一局提示還在等待玩家回應時，設定會暫時鎖定。',
  'room.next_match.locked.live': '目前對局進行中，結束後才能再次調整設定。',
  'room.next_match.locked.filled':
    '黑白雙方都入座後，房間準備自動開始，設定也會先鎖定。',
  'room.rematch.eyebrow': '再來一局',
  'room.rematch.title': '還要再下一場嗎？',
  'room.rematch.description.player':
    '兩位入座玩家都要回應後，房間才會自動開始下一局。',
  'room.rematch.description.spectator':
    '只有兩位入座玩家可以回應，其他人可以在這裡看到目前的回覆狀態。',
  'room.rematch.accept': '再來一局',
  'room.rematch.decline': '先不要',
  'room.rematch.response.pending': '等待中',
  'room.rematch.response.accepted': '已同意',
  'room.rematch.response.declined': '先跳過',
  'room.rematch.blocked':
    '有玩家先不再來一局。請先變更座位，房間才會重新啟用自動開始。',
} as const;

const ZH_TW_TRANSLATIONS: Record<GoTranslationKey, string> = {
  ...ZH_CORE,
  ...ZH_GAME,
  ...ZH_ROOM_SHARED,
  ...ZH_MODES,
  ...ZH_LOCAL_UI,
  ...ZH_HOSTED_UI,
};

export const GO_TRANSLATIONS = {
  en: EN_TRANSLATIONS,
  'zh-TW': ZH_TW_TRANSLATIONS,
} as const;
