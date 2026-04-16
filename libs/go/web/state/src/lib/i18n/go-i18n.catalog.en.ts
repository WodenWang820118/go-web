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
  'room.notice.closed_by_host': 'The host closed the room.',
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
  'lobby.notice.room_closed_self': 'Room closed.',
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
  'room.hero.share': 'Share',
  'room.hero.share_url': 'Share URL',
  'room.hero.copy': 'Copy',
  'room.hero.copy_link': 'Copy room link',
  'room.hero.copied': 'Copied',
  'room.hero.retry_copy_link': 'Retry copying room link',
  'room.hero.copy_complete': 'Room link copied to clipboard.',
  'room.hero.copy_failed':
    'Automatic copy is unavailable. Copy the room link below instead.',
  'room.hero.copy_manual_instruction':
    'Select the room link below and copy it manually.',
  'room.hero.manual_url_label': 'Room link to copy manually',
  'room.page.back_to_lobby': 'Back to lobby',
  'room.leave.confirm.header': 'Leave this room?',
  'room.leave.confirm.message':
    'Leaving will close the room and return everyone who is still inside to the lobby.',
  'room.leave.confirm.accept': 'Leave and close room',
  'room.leave.confirm.reject': 'Stay in room',
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
  'room.participants.start_match': 'Start match',
  'room.participants.finish_current_before_start':
    'Finish the current match before changing seats or starting another one.',
  'room.participants.mode': 'Mode',
  'room.participants.board_size': 'Board size',
  'room.participants.start_hosted_match': 'Start hosted match',
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
  'room.dialog.auto_start.title': 'Next match started',
  'room.dialog.match_result.title': 'Match result',
  'room.chat.title': 'Room chat',
  'room.chat.empty': 'Join the room to start the conversation.',
  'room.chat.message': 'Message',
  'room.chat.placeholder': 'Message the room...',
  'room.chat.send': 'Send',
  'room.sidebar.decorative_avatar': 'Decorative avatar',
  'room.sidebar.decorative_clock': 'Decorative clock',
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
  'lobby.table.room': 'Room',
  'lobby.table.mode': 'Mode',
  'lobby.table.black': 'Black',
  'lobby.table.white': 'White',
  'lobby.table.people_online': 'People / online',
  'lobby.table.status': 'Status',
  'lobby.table.updated': 'Updated',
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

export const EN_TRANSLATIONS = {
  ...EN_CORE,
  ...EN_GAME,
  ...EN_ROOM_SHARED,
  ...EN_MODES,
  ...EN_LOCAL_UI,
  ...EN_HOSTED_UI,
} as const;

export type GoTranslationKey = keyof typeof EN_TRANSLATIONS;
