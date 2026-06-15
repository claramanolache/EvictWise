CREATE DATABASE lawyers;

USE lawyers;

CREATE TABLE contact(
    id INT AUTO_INCREMENT PRIMARY KEY,
    fname VARCHAR(25) NOT NULL,
    lname VARCHAR(25) NOT NULL,
    email VARCHAR(50) NOT NULL CHECK (email LIKE '%@%.%'),
    phone VARCHAR(15) CHECK (phone LIKE '07[0-9]{8}')
);

CREATE TABLE cases(
      case_citation VARCHAR(300) PRIMARY KEY,
      type VARCHAR(25) NOT NULL,
      description TEXT NOT NULL,
      file_link VARCHAR(200) CHECK
          (file_link LIKE '%.txt' OR file_link LIKE '%.pdf' or file_link LIKE '%.md') NOT NULL,
      win BOOLEAN,
      lawyer_id INT NOT NULL REFERENCES contact (id)
);

CREATE TABLE prices(
       lawyer_id INT NOT NULL REFERENCES contact (id),
       case_type VARCHAR(25) NOT NULL,
       standard_price DECIMAL(10,2) NOT NULL,
       discount_offer BOOLEAN NOT NULL,
       PRIMARY KEY (lawyer_id, case_type)
);

CREATE TABLE credits(
    bar_lisence DECIMAL(7, 0) CHECK (bar_lisence > 10000) NOT NULL,
    state_of_bar VARCHAR(2) NOT NULL,
    lawyer_id INT NOT NULL REFERENCES contact (id),
    primary key (bar_lisence, state_of_bar)
);

CREATE TABLE jurisdiction(
    lawyer_id INT NOT NULL REFERENCES contact (id),
    jurisdiction VARCHAR(25) NOT NULL,
    PRIMARY KEY (lawyer_id, jurisdiction)
);

CREATE TABLE scopelaw(
    lawyer_id INT NOT NULL REFERENCES contact (id),
    scope VARCHAR(25) NOT NULL,
    PRIMARY KEY (lawyer_id, scope)
);

CREATE TABLE education(
    lawyer_id INT NOT NULL REFERENCES contact (id),
    degree VARCHAR(25) NOT NULL,
    university VARCHAR(25) NOT NULL,
    PRIMARY KEY (lawyer_id, degree)
)

