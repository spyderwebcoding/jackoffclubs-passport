-- The original constraint required *exactly one* of club_id/proposed_name.
-- That breaks approval of new-club proposals: we link club_id to the newly
-- created club while keeping proposed_name as a record of what was asked
-- for, which briefly (permanently, post-approval) has both set. Relax to
-- just requiring at least one target.
alter table club_claim_requests drop constraint claim_targets_one_thing;

alter table club_claim_requests add constraint claim_has_a_target check (
  club_id is not null or proposed_name is not null
);
