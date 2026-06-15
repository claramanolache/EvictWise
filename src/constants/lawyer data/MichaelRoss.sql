INSERT INTO contact(fname, lname, email, phone)
VALUES ('Michael', 'Ross', 'mikeRoss@suits.com', '0700000000');

INSERT INTO credits (bar_lisence, state_of_bar, lawyer_id)
VALUES (99999, 'NY', 6);

INSERT INTO education (lawyer_id, degree, university)
VALUES (6, 'None', 'None');

INSERT INTO jurisdiction (lawyer_id, jurisdiction)
VALUES (6, 'New York');

INSERT INTO scopelaw (lawyer_id, scope)
VALUES (6, 'Pro bono');

INSERT INTO prices (lawyer_id, case_type, standard_price, discount_offer)
VALUES (6, 'Consultation', 0.00, 1);

INSERT INTO cases(case_citation, type, description, file_link, win, lawyer_id)
VALUES ('Ross v. State 2024', 'Criminal', 'Unlicensed practice of law', 'ross_case.pdf', 0, 6);