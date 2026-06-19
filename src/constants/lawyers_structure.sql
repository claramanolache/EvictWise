CREATE DATABASE lawyers;

USE lawyers;

CREATE TABLE contact(
    id INT AUTO_INCREMENT PRIMARY KEY,
    website VARCHAR(100) NOT NULL,
    phone VARCHAR(15) CHECK (phone LIKE '07[0-9]{8}'),
    email VARCHAR(50) NOT NULL CHECK (email LIKE '%@%.%'),
    address VARCHAR(50)
);

CREATE TABLE description(
    id INT PRIMARY KEY REFERENCES contact (id),
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE cases(
      case_citation VARCHAR(300) PRIMARY KEY,
      type VARCHAR(25) NOT NULL,
      description TEXT NOT NULL,
      file_link VARCHAR(200) CHECK
          (file_link LIKE '%.txt' OR file_link LIKE '%.pdf' or file_link LIKE '%.md') NOT NULL,
      win BOOLEAN,
      id INT NOT NULL REFERENCES contact (id)
);

CREATE TABLE prices(
       lawyer_id INT NOT NULL REFERENCES contact (id),
       case_type VARCHAR(25) NOT NULL,
       standard_price DECIMAL(10,2) NOT NULL,
       discount_offer BOOLEAN NOT NULL,
       PRIMARY KEY (lawyer_id, case_type)
);

CREATE TABLE jurisdiction(
    lawyer_id INT NOT NULL REFERENCES contact (id),
    jurisdiction VARCHAR(25) NOT NULL,
    PRIMARY KEY (lawyer_id, jurisdiction)
);

CREATE TABLE scopelaw(
    id INT NOT NULL REFERENCES contact (id),
    county VARCHAR(25) NOT NULL,
    PRIMARY KEY (id, county)
);

