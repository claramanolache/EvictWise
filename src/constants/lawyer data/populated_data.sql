-- Random data for lawyers
USE lawyers;

INSERT INTO contact (fname, lname, email, phone) VALUES 
('Harvey', 'Specter', 'harvey@specterliber.com', '0712345678'),
('Jessica', 'Pearson', 'jessica@pearsonhardman.com', '0722345678'),
('Louis', 'Litt', 'louis.litt@pearsonhardman.com', '0732345678'),
('Donna', 'Paulsen', 'donna@specterliber.com', '0742345678'),
('Rachel', 'Zane', 'rachel.zane@zaneandassoc.com', '0752345678');

-- Assuming IDs 1-5 were generated for the above contacts

-- Education
INSERT INTO education (lawyer_id, degree, university) VALUES
(1, 'J.D.', 'Harvard Law School'),
(2, 'J.D.', 'Harvard Law School'),
(3, 'J.D.', 'Columbia Law School'),
(4, 'B.A.', 'New York University'),
(5, 'J.D.', 'Columbia Law School');

-- Credits (Bar Licenses)
INSERT INTO credits (bar_lisence, state_of_bar, lawyer_id) VALUES 
(12345, 'NY', 1),
(11111, 'NY', 2),
(22222, 'NY', 3),
(33333, 'NY', 4),
(44444, 'NY', 5);

-- Jurisdiction
INSERT INTO jurisdiction (lawyer_id, jurisdiction) VALUES 
(1, 'New York'),
(1, 'Federal'),
(2, 'New York'),
(2, 'Chicago'),
(3, 'New York'),
(4, 'New York'),
(5, 'New York');

-- Scope Law
INSERT INTO scopelaw (lawyer_id, scope) VALUES 
(1, 'Corporate'),
(1, 'Litigation'),
(2, 'Corporate'),
(2, 'Management'),
(3, 'Finance'),
(3, 'Litigation'),
(4, 'Legal Assistance'),
(5, 'Paralegal'),
(5, 'Family Law');

-- Prices
INSERT INTO prices (lawyer_id, case_type, standard_price, discount_offer) VALUES 
(1, 'Corporate Merger', 5000.00, 0),
(1, 'Litigation', 3000.00, 1),
(2, 'Corporate Strategy', 6000.00, 0),
(3, 'Financial Fraud', 4500.00, 1),
(5, 'Divorce', 2000.00, 1);

-- Cases
INSERT INTO cases (case_citation, type, description, file_link, win, lawyer_id) VALUES 
('Specter v. Hardman 2024', 'Litigation', 'Corporate takeover dispute', 'specter_v_hardman.pdf', 1, 1),
('Pearson v. Darby 2023', 'Arbitration', 'International merger conflict', 'pearson_darby.txt', 1, 2),
('Litt v. Gillis 2022', 'Finance', 'Insider trading investigation', 'litt_gillis.md', 0, 3),
('Zane v. Rand 2025', 'Family Law', 'High profile divorce case', 'zane_rand.pdf', 1, 5);
