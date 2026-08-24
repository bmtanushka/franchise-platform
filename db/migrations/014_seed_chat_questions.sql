-- ============================================================================
-- Seeds chat_questions/chat_question_options with exactly what
-- agent/app/question_sets.py's static Python dicts contained before this
-- migration — same keys, prompts, types, enum values, depends_on rules,
-- and lead_field mappings — so production behavior is unchanged the
-- moment this deploys. Enum options get generated human-friendly labels
-- (the old model had no separate label, just the raw value) since that's
-- exactly the capability this feature adds; admin can reword them freely
-- afterward. Positions leave gaps (specific fields start at 0, closing
-- fields start at 100+) so future admin-added questions have room without
-- renumbering everything.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- franchise_interest — 5 specific fields, 4 closing fields (no postcode)
-- ---------------------------------------------------------------------------
do $$
declare
  v_service_id uuid;
  v_ownership_id uuid;
  v_capital_id uuid;
  v_timeline_id uuid;
begin
  select id into v_service_id from service_types where key = 'franchise_interest';

  insert into chat_questions (service_type_id, key, prompt, field_type, position) values
    (v_service_id, 'interest_reason', 'What''s drawing you to franchise ownership with us?', 'text', 0),
    (v_service_id, 'desired_operating_location', 'What city, region, or territory are you hoping to open a location in?', 'text', 3);

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'ownership_experience', 'Have you owned or managed a business before?', 'enum', 1)
  returning id into v_ownership_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_ownership_id, 'never_owned', 'Never owned', 0),
    (v_ownership_id, 'managed_not_owned', 'Managed, but never owned', 1),
    (v_ownership_id, 'owned_before', 'Owned before', 2),
    (v_ownership_id, 'own_currently', 'Own currently', 3);

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'capital_readiness', 'Do you have investment capital ready, or are you still exploring financing options?', 'enum', 2)
  returning id into v_capital_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_capital_id, 'capital_ready', 'Capital ready', 0),
    (v_capital_id, 'exploring_financing', 'Exploring financing options', 1),
    (v_capital_id, 'not_yet_sure', 'Not sure yet', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'target_timeline', 'What''s your timeline to open — within 6 months, 6-12 months, or just researching for now?', 'enum', 4)
  returning id into v_timeline_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_timeline_id, 'within_6_months', 'Within 6 months', 0),
    (v_timeline_id, '6_12_months', '6-12 months', 1),
    (v_timeline_id, 'just_researching', 'Just researching', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, lead_field, position) values
    (v_service_id, 'full_name', 'What''s your full name?', 'text', 'full_name', 100),
    (v_service_id, 'contact_email', 'What''s the best email to reach you at?', 'email', 'contact_email', 101),
    (v_service_id, 'contact_phone', 'And a phone number where we can reach you?', 'phone', 'contact_phone', 102),
    (v_service_id, 'consent_to_contact', 'Do you consent to being contacted by our franchise development team about this?', 'boolean', 'consent_to_contact', 103);
end $$;

-- ---------------------------------------------------------------------------
-- credit — 2 specific fields, common closing (5, with postcode)
-- ---------------------------------------------------------------------------
do $$
declare
  v_service_id uuid;
  v_score_id uuid;
begin
  select id into v_service_id from service_types where key = 'credit';

  insert into chat_questions (service_type_id, key, prompt, field_type, position) values
    (v_service_id, 'credit_goal', 'What''s the main reason you''re looking to build or repair credit right now?', 'text', 0);

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'approximate_credit_score', 'Roughly how would you describe your current credit? Excellent, good, fair, poor, or not sure?', 'enum', 1)
  returning id into v_score_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_score_id, 'excellent', 'Excellent', 0),
    (v_score_id, 'good', 'Good', 1),
    (v_score_id, 'fair', 'Fair', 2),
    (v_score_id, 'poor', 'Poor', 3),
    (v_score_id, 'not_sure', 'Not sure', 4);

  insert into chat_questions (service_type_id, key, prompt, field_type, lead_field, position) values
    (v_service_id, 'full_name', 'What''s your full name?', 'text', 'full_name', 100),
    (v_service_id, 'contact_email', 'What''s the best email to reach you at?', 'email', 'contact_email', 101),
    (v_service_id, 'contact_phone', 'And a phone number where we can reach you?', 'phone', 'contact_phone', 102),
    (v_service_id, 'postcode', 'What''s your postcode / ZIP code? This helps us match you with someone in your area.', 'text', 'postcode', 103),
    (v_service_id, 'consent_to_contact', 'Do you consent to being contacted by one of our service providers about this? (yes/no)', 'boolean', 'consent_to_contact', 104);
end $$;

-- ---------------------------------------------------------------------------
-- mortgage — 6 specific fields (3 conditional), common closing
-- ---------------------------------------------------------------------------
do $$
declare
  v_service_id uuid;
  v_purpose_id uuid;
  v_preapproval_id uuid;
begin
  select id into v_service_id from service_types where key = 'mortgage';

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'mortgage_purpose', 'Are you looking to purchase a home, refinance, or take out a home equity loan?', 'enum', 0)
  returning id into v_purpose_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_purpose_id, 'purchase', 'Purchase', 0),
    (v_purpose_id, 'refinance', 'Refinance', 1),
    (v_purpose_id, 'home_equity', 'Home equity', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, position) values
    (v_service_id, 'property_location', 'What area or city is the property in (or where are you looking)?', 'text', 1),
    (v_service_id, 'estimated_price_range', 'What''s your estimated price range or loan amount?', 'text', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, depends_on_key, depends_on_mode, depends_on_values, position)
  values (v_service_id, 'preapproval_status', 'Have you already been pre-approved, or are you just starting to look?', 'enum', 'mortgage_purpose', 'equals', array['purchase'], 3)
  returning id into v_preapproval_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_preapproval_id, 'pre_approved', 'Pre-approved', 0),
    (v_preapproval_id, 'not_yet', 'Not yet', 1);

  insert into chat_questions (service_type_id, key, prompt, field_type, depends_on_key, depends_on_mode, depends_on_values, position) values
    (v_service_id, 'current_lender', 'Who''s your current mortgage lender?', 'text', 'mortgage_purpose', 'equals', array['refinance'], 4),
    (v_service_id, 'home_equity_purpose', 'What would you use the home equity funds for?', 'text', 'mortgage_purpose', 'equals', array['home_equity'], 5);

  insert into chat_questions (service_type_id, key, prompt, field_type, lead_field, position) values
    (v_service_id, 'full_name', 'What''s your full name?', 'text', 'full_name', 100),
    (v_service_id, 'contact_email', 'What''s the best email to reach you at?', 'email', 'contact_email', 101),
    (v_service_id, 'contact_phone', 'And a phone number where we can reach you?', 'phone', 'contact_phone', 102),
    (v_service_id, 'postcode', 'What''s your postcode / ZIP code? This helps us match you with someone in your area.', 'text', 'postcode', 103),
    (v_service_id, 'consent_to_contact', 'Do you consent to being contacted by one of our service providers about this? (yes/no)', 'boolean', 'consent_to_contact', 104);
end $$;

-- ---------------------------------------------------------------------------
-- real_estate — 5 specific fields (2 conditional), common closing
-- ---------------------------------------------------------------------------
do $$
declare
  v_service_id uuid;
  v_intent_id uuid;
  v_timeline_id uuid;
  v_financing_id uuid;
  v_property_status_id uuid;
begin
  select id into v_service_id from service_types where key = 'real_estate';

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'real_estate_intent', 'Are you looking to buy, sell, or both?', 'enum', 0)
  returning id into v_intent_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_intent_id, 'buying', 'Buying', 0),
    (v_intent_id, 'selling', 'Selling', 1),
    (v_intent_id, 'both', 'Both', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, position) values
    (v_service_id, 'target_area', 'What area are you interested in?', 'text', 1);

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'timeline', 'What''s your timeline — immediately, 1-3 months, 3-6 months, or just exploring?', 'enum', 2)
  returning id into v_timeline_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_timeline_id, 'immediately', 'Immediately', 0),
    (v_timeline_id, '1_3_months', '1-3 months', 1),
    (v_timeline_id, '3_6_months', '3-6 months', 2),
    (v_timeline_id, 'just_exploring', 'Just exploring', 3);

  insert into chat_questions (service_type_id, key, prompt, field_type, depends_on_key, depends_on_mode, depends_on_values, position)
  values (v_service_id, 'financing_status', 'Are you pre-approved for financing, still need financing, or paying cash?', 'enum', 'real_estate_intent', 'one_of', array['buying', 'both'], 3)
  returning id into v_financing_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_financing_id, 'pre_approved', 'Pre-approved', 0),
    (v_financing_id, 'need_financing', 'Need financing', 1),
    (v_financing_id, 'cash', 'Paying cash', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, depends_on_key, depends_on_mode, depends_on_values, position)
  values (v_service_id, 'current_property_status', 'For the property you''re selling — do you own it outright, or is there a mortgage on it?', 'enum', 'real_estate_intent', 'one_of', array['selling', 'both'], 4)
  returning id into v_property_status_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_property_status_id, 'owned_outright', 'Owned outright', 0),
    (v_property_status_id, 'has_mortgage', 'Has a mortgage', 1);

  insert into chat_questions (service_type_id, key, prompt, field_type, lead_field, position) values
    (v_service_id, 'full_name', 'What''s your full name?', 'text', 'full_name', 100),
    (v_service_id, 'contact_email', 'What''s the best email to reach you at?', 'email', 'contact_email', 101),
    (v_service_id, 'contact_phone', 'And a phone number where we can reach you?', 'phone', 'contact_phone', 102),
    (v_service_id, 'postcode', 'What''s your postcode / ZIP code? This helps us match you with someone in your area.', 'text', 'postcode', 103),
    (v_service_id, 'consent_to_contact', 'Do you consent to being contacted by one of our service providers about this? (yes/no)', 'boolean', 'consent_to_contact', 104);
end $$;

-- ---------------------------------------------------------------------------
-- foreign_national_credit — 3 specific fields, common closing
-- ---------------------------------------------------------------------------
do $$
declare
  v_service_id uuid;
  v_history_id uuid;
begin
  select id into v_service_id from service_types where key = 'foreign_national_credit';

  insert into chat_questions (service_type_id, key, prompt, field_type, position) values
    (v_service_id, 'country_of_origin', 'What country are you relocating from?', 'text', 0),
    (v_service_id, 'visa_status', 'What''s your current visa or residency status in the US?', 'text', 1);

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'us_credit_history', 'Do you have any US credit history yet — none, some, or established?', 'enum', 2)
  returning id into v_history_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_history_id, 'none', 'None', 0),
    (v_history_id, 'some', 'Some', 1),
    (v_history_id, 'established', 'Established', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, lead_field, position) values
    (v_service_id, 'full_name', 'What''s your full name?', 'text', 'full_name', 100),
    (v_service_id, 'contact_email', 'What''s the best email to reach you at?', 'email', 'contact_email', 101),
    (v_service_id, 'contact_phone', 'And a phone number where we can reach you?', 'phone', 'contact_phone', 102),
    (v_service_id, 'postcode', 'What''s your postcode / ZIP code? This helps us match you with someone in your area.', 'text', 'postcode', 103),
    (v_service_id, 'consent_to_contact', 'Do you consent to being contacted by one of our service providers about this? (yes/no)', 'boolean', 'consent_to_contact', 104);
end $$;

-- ---------------------------------------------------------------------------
-- business_credit — 3 specific fields, common closing
-- ---------------------------------------------------------------------------
do $$
declare
  v_service_id uuid;
  v_years_id uuid;
begin
  select id into v_service_id from service_types where key = 'business_credit';

  insert into chat_questions (service_type_id, key, prompt, field_type, position) values
    (v_service_id, 'business_name', 'What''s your business name?', 'text', 0);

  insert into chat_questions (service_type_id, key, prompt, field_type, position)
  values (v_service_id, 'years_in_business', 'How long have you been in business — not yet started, less than 1 year, 1-3 years, or 3+ years?', 'enum', 1)
  returning id into v_years_id;
  insert into chat_question_options (chat_question_id, value, label, position) values
    (v_years_id, 'not_yet_started', 'Not yet started', 0),
    (v_years_id, 'less_than_1', 'Less than 1 year', 1),
    (v_years_id, '1_3', '1-3 years', 2),
    (v_years_id, '3_plus', '3+ years', 3);

  insert into chat_questions (service_type_id, key, prompt, field_type, position) values
    (v_service_id, 'funding_amount_needed', 'Roughly how much funding are you looking for?', 'text', 2);

  insert into chat_questions (service_type_id, key, prompt, field_type, lead_field, position) values
    (v_service_id, 'full_name', 'What''s your full name?', 'text', 'full_name', 100),
    (v_service_id, 'contact_email', 'What''s the best email to reach you at?', 'email', 'contact_email', 101),
    (v_service_id, 'contact_phone', 'And a phone number where we can reach you?', 'phone', 'contact_phone', 102),
    (v_service_id, 'postcode', 'What''s your postcode / ZIP code? This helps us match you with someone in your area.', 'text', 'postcode', 103),
    (v_service_id, 'consent_to_contact', 'Do you consent to being contacted by one of our service providers about this? (yes/no)', 'boolean', 'consent_to_contact', 104);
end $$;
