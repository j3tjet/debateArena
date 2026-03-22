# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass


@allow_storage
@dataclass
class Room:
    id: u256
    topic: str
    person1: str
    person1_name: str
    person2: str
    person2_name: str
    current_turn: u8
    argument_count: u8
    arguments_log: str
    debate_summary: str
    final_report: str
    is_active: bool
    is_finalized: bool


class DebateRoomsMVP(gl.Contract):
    next_room_id: u256
    rooms: TreeMap[u256, Room]

    reasoning_weight_bps: u256
    evidence_weight_bps: u256
    clash_weight_bps: u256
    relevance_weight_bps: u256
    clarity_weight_bps: u256

    def __init__(self):
        self.next_room_id = u256(1)
        self.rooms = TreeMap[u256, Room]()

        # 30 / 25 / 20 / 15 / 10
        self.reasoning_weight_bps = u256(3000)
        self.evidence_weight_bps = u256(2500)
        self.clash_weight_bps = u256(2000)
        self.relevance_weight_bps = u256(1500)
        self.clarity_weight_bps = u256(1000)

    def _clean_text(self, raw: str) -> str:
        cleaned = str(raw).strip()
        cleaned = cleaned.replace("```text", "")
        cleaned = cleaned.replace("```", "")
        return cleaned.strip()

    def _build_final_prompt(
        self,
        topic: str,
        person1_name: str,
        person2_name: str,
        debate_summary: str,
        arguments_log: str,
        reasoning_weight: str,
        evidence_weight: str,
        clash_weight: str,
        relevance_weight: str,
        clarity_weight: str,
    ) -> str:
        return f"""
You are an expert debate judge and adjudication engine.

Your task is to evaluate a 2-person debate fairly and explainably.

Important rules:
- Be neutral.
- Do not decide based on ideology, style alone, or confidence alone.
- Reward reasoning quality, evidence quality, clash/engagement with the opponent, relevance, and clarity.
- If evidence is weak on both sides, say so.
- If the result is close, say so.
- Use only the debate transcript and summary provided below.
- Do not browse the web.
- Do not invent missing facts.
- Output ONLY plain text in the exact format requested.

SCORING WEIGHTS:
- reasoning: {reasoning_weight}
- evidence: {evidence_weight}
- clash: {clash_weight}
- relevance: {relevance_weight}
- clarity: {clarity_weight}

TOPIC:
{topic}

PARTICIPANTS:
A = {person1_name}
B = {person2_name}

DEBATE SUMMARY:
{debate_summary}

FULL ARGUMENT LOG:
{arguments_log}

Return ONLY plain text using EXACTLY this structure:

WINNER: A|B|TIE|NO_CLEAR_WINNER
WINNER_NAME: <name or tie>
MARGIN: CLEAR|MODERATE|NARROW|NONE
CONFIDENCE: <0.0 to 1.0>

SIDE_A_REASONING: <0 to 5>
SIDE_A_EVIDENCE: <0 to 5>
SIDE_A_CLASH: <0 to 5>
SIDE_A_RELEVANCE: <0 to 5>
SIDE_A_CLARITY: <0 to 5>

SIDE_B_REASONING: <0 to 5>
SIDE_B_EVIDENCE: <0 to 5>
SIDE_B_CLASH: <0 to 5>
SIDE_B_RELEVANCE: <0 to 5>
SIDE_B_CLARITY: <0 to 5>

CATEGORY_WINNERS:
- REASONING: A|B|TIE
- EVIDENCE: A|B|TIE
- CLASH: A|B|TIE
- RELEVANCE: A|B|TIE
- CLARITY: A|B|TIE

DECISION_BASIS:
- <bullet 1>
- <bullet 2>
- <bullet 3>

JUDGE_NOTES:
<short paragraph>

VIEWER_REPORT:
<short paragraph for normal users>

Do not output JSON.
Do not output markdown fences.
Do not output anything outside this exact structure.
"""

    @gl.public.write
    def create_room(self, topic: str, person1_name: str) -> str:
        sender = str(gl.message.sender_address)
        room_id = self.next_room_id

        room = Room(
            id=room_id,
            topic=topic,
            person1=sender,
            person1_name=person1_name,
            person2="",
            person2_name="",
            current_turn=u8(1),
            argument_count=u8(0),
            arguments_log="",
            debate_summary="",
            final_report="",
            is_active=False,
            is_finalized=False,
        )

        self.rooms[room_id] = room
        self.next_room_id = u256(int(self.next_room_id) + 1)

        return str(int(room_id))

    @gl.public.write
    def register_person2(self, room_id: u256, person2_name: str) -> str:
        room = self.rooms[room_id]
        sender = str(gl.message.sender_address)

        if room.is_finalized:
            raise gl.vm.UserError("Room already finalized")

        if room.person2 != "":
            raise gl.vm.UserError("person2 already registered")

        if sender == room.person1:
            raise gl.vm.UserError("person1 cannot register as person2")

        updated_room = Room(
            id=room.id,
            topic=room.topic,
            person1=room.person1,
            person1_name=room.person1_name,
            person2=sender,
            person2_name=person2_name,
            current_turn=u8(1),
            argument_count=room.argument_count,
            arguments_log=room.arguments_log,
            debate_summary=room.debate_summary,
            final_report=room.final_report,
            is_active=True,
            is_finalized=room.is_finalized,
        )

        self.rooms[room_id] = updated_room
        return "ok"

    @gl.public.write
    def submit_argument(self, room_id: u256, argument_text: str) -> str:
        room = self.rooms[room_id]
        sender = str(gl.message.sender_address)

        if room.is_finalized:
            raise gl.vm.UserError("Room already finalized")

        if not room.is_active:
            raise gl.vm.UserError("Room is not active")

        if room.person2 == "":
            raise gl.vm.UserError("Room does not have person2 yet")

        if int(room.argument_count) >= 6:
            raise gl.vm.UserError("Maximum number of arguments reached")

        expected_sender = room.person1
        speaker_name = room.person1_name
        side = "A"

        if int(room.current_turn) == 2:
            expected_sender = room.person2
            speaker_name = room.person2_name
            side = "B"

        if sender != expected_sender:
            raise gl.vm.UserError("It is not your turn")

        argument_number = int(room.argument_count) + 1

        line = (
            "ARG#"
            + str(argument_number)
            + "|SIDE="
            + side
            + "|NAME="
            + speaker_name
            + "|ADDR="
            + sender
            + "|TEXT="
            + str(argument_text)
        )

        new_log = room.arguments_log
        if new_log == "":
            new_log = line
        else:
            new_log = new_log + "\n" + line

        summary_line = (
            "Turn "
            + str(argument_number)
            + " | Side "
            + side
            + " | "
            + speaker_name
            + ": "
            + str(argument_text)
        )

        new_summary = room.debate_summary
        if new_summary == "":
            new_summary = summary_line
        else:
            new_summary = new_summary + "\n" + summary_line

        next_turn = u8(2)
        if int(room.current_turn) == 2:
            next_turn = u8(1)

        updated_room = Room(
            id=room.id,
            topic=room.topic,
            person1=room.person1,
            person1_name=room.person1_name,
            person2=room.person2,
            person2_name=room.person2_name,
            current_turn=next_turn,
            argument_count=u8(argument_number),
            arguments_log=new_log,
            debate_summary=new_summary,
            final_report=room.final_report,
            is_active=room.is_active,
            is_finalized=room.is_finalized,
        )

        self.rooms[room_id] = updated_room
        return "ok"

    @gl.public.write
    def finalize_room(self, room_id: u256) -> str:
        room = self.rooms[room_id]

        if room.is_finalized:
            raise gl.vm.UserError("Room already finalized")

        if room.person2 == "":
            raise gl.vm.UserError("Room does not have person2 yet")

        if int(room.argument_count) < 2:
            raise gl.vm.UserError("At least 2 arguments are required to finalize")

        room_mem = gl.storage.copy_to_memory(room)

        rw = str(float(self.reasoning_weight_bps) / 10000.0)
        ew = str(float(self.evidence_weight_bps) / 10000.0)
        cw = str(float(self.clash_weight_bps) / 10000.0)
        relw = str(float(self.relevance_weight_bps) / 10000.0)
        clw = str(float(self.clarity_weight_bps) / 10000.0)

        def analyze_final() -> str:
            prompt = self._build_final_prompt(
                topic=str(room_mem.topic),
                person1_name=str(room_mem.person1_name),
                person2_name=str(room_mem.person2_name),
                debate_summary=str(room_mem.debate_summary),
                arguments_log=str(room_mem.arguments_log),
                reasoning_weight=rw,
                evidence_weight=ew,
                clash_weight=cw,
                relevance_weight=relw,
                clarity_weight=clw,
            )
            raw = gl.nondet.exec_prompt(prompt)
            return self._clean_text(raw)

        final_report = gl.eq_principle.prompt_comparative(
            analyze_final,
            principle="""
Two outputs are equivalent if they reach the same overall winner
(or both say tie / no clear winner), describe a very similar margin,
assign broadly similar category judgments, and present substantially
the same reasoning for the decision.

Minor wording differences are acceptable.
""",
        )

        updated_room = Room(
            id=room.id,
            topic=room.topic,
            person1=room.person1,
            person1_name=room.person1_name,
            person2=room.person2,
            person2_name=room.person2_name,
            current_turn=room.current_turn,
            argument_count=room.argument_count,
            arguments_log=room.arguments_log,
            debate_summary=room.debate_summary,
            final_report=str(final_report),
            is_active=False,
            is_finalized=True,
        )

        self.rooms[room_id] = updated_room
        return str(final_report)

    @gl.public.view
    def get_room(self, room_id: u256) -> str:
        room = self.rooms[room_id]

        return (
            "id=" + str(int(room.id))
            + "\ntopic=" + room.topic
            + "\nperson1=" + room.person1
            + "\nperson1_name=" + room.person1_name
            + "\nperson2=" + room.person2
            + "\nperson2_name=" + room.person2_name
            + "\ncurrent_turn=" + str(int(room.current_turn))
            + "\nargument_count=" + str(int(room.argument_count))
            + "\narguments_log=" + room.arguments_log
            + "\ndebate_summary=" + room.debate_summary
            + "\nfinal_report=" + room.final_report
            + "\nis_active=" + str(room.is_active)
            + "\nis_finalized=" + str(room.is_finalized)
        )

    @gl.public.view
    def get_room_arguments(self, room_id: u256) -> str:
        room = self.rooms[room_id]
        return room.arguments_log

    @gl.public.view
    def get_argument_count(self, room_id: u256) -> str:
        room = self.rooms[room_id]
        return str(int(room.argument_count))

    @gl.public.view
    def get_final_report(self, room_id: u256) -> str:
        room = self.rooms[room_id]
        return room.final_report

    @gl.public.view
    def get_next_room_id(self) -> str:
        return str(int(self.next_room_id))