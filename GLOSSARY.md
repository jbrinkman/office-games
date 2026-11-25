# Office Games

A collection of classic gameshow-style games that a host runs for a group of contestants, with viewers following along live. The first game is Peril!, a quiz game in the style of the classic TV show.

## Language

**Peril**:
The first game in the collection: a clue-and-response quiz game played on a board of categories and dollar values.
_Avoid_: Jeopardy

**Host**:
The person who sets up a Game, judges responses, and controls everything that happens on the board.
_Avoid_: Moderator, admin, game master

**Contestant**:
A named person added by the Host who competes and has a score. Contestants do not interact with the Game themselves.
_Avoid_: Player, participant

**Viewer**:
Anyone who opens the Game URL to follow along read-only.
_Avoid_: Spectator, audience, guest

**Gamefile**:
The reusable content of a Peril game: its categories, clues, responses, and Final Peril Clue.
_Avoid_: Game board, quiz, deck

**Game**:
One live run of a Gamefile with its Contestants and scores, followed by Viewers at a Game URL.
_Avoid_: Session, match, room

**Active Contestant**:
The one Contestant the Host has highlighted as currently in control of the board or answering. At most one at a time.
_Avoid_: Current player, turn, buzzed-in contestant

**Clue**:
The prompt shown to Contestants, worth a dollar value on the board.
_Avoid_: Question, answer (on the show, the Clue reads like an answer)

**Response**:
What a Contestant says to a Clue, and the correct one stored in the Gamefile.
_Avoid_: Answer, solution

## Rounds

**Peril round**:
The first round of a Game: a board of six categories with five Clues each.
_Avoid_: Jeopardy round, round one

**Double Peril round**:
The second round, with the same board shape and doubled Clue values.
_Avoid_: Double Jeopardy round, round two

**Category reveal**:
The start of each round, when the Host uncovers the category names one at a time, left to right, before any Clue is played.
_Avoid_: Category intro, board reveal

**Hint**:
An optional short description of a category, shown to Viewers and read aloud by the Host during the Category reveal.
_Avoid_: Description, subtitle, tooltip

**Double Down**:
A hidden Clue where the Active Contestant wagers on their own Response instead of playing for the Clue's value.
_Avoid_: Daily Double, wager clue

**Final Peril**:
The closing round in which each eligible Contestant wagers, then writes a Response to one last Clue.
_Avoid_: Final Jeopardy
