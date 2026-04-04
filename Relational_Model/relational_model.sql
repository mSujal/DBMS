CREATE DATABASE IF NOT EXISTS Hotel_Management;

USE Hotel_Management;

-- ==============================================
-- SECTION 1: ROLE
-- ==============================================
CREATE TABLE Roles (
    RoleID      INT,
    Role_Name   VARCHAR(100)    NOT NULL UNIQUE,
    Base_Salary DECIMAL(10,2)   NOT NULL,
    PRIMARY KEY (RoleID)
);

-- ==============================================
-- SECTION 2: DEPARTMENT
-- ==============================================
CREATE TABLE Department (
    DeptID      INT,
    Dept_Name   VARCHAR(100)    NOT NULL UNIQUE,
    ManagerId   INT,
    PRIMARY KEY (DeptID)
);

-- ==============================================
-- SECTION 3: STAFF
-- ==============================================
CREATE TABLE Staff (
    StaffID     INT,
    First_Name  VARCHAR(50)     NOT NULL,
    Last_Name   VARCHAR(50)     NOT NULL,
    Email       VARCHAR(100)    NOT NULL UNIQUE,
    Phone       VARCHAR(20),
    Hire_Date   DATE            NOT NULL,
    Salary      DECIMAL(10, 2)  NOT NULL,
    DeptID      INT             NOT NULL,
    RoleId      INT             NOT NULL,
    PRIMARY KEY (StaffID),
    FOREIGN KEY (DeptID)  REFERENCES Department(DeptID),
    FOREIGN KEY (RoleId)  REFERENCES Roles(RoleID)
);

-- Adding ManagerID FK on Department
ALTER TABLE Department
    ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (ManagerId) REFERENCES Staff(StaffID);

-- ==============================================
-- SECTION 4: GUEST
-- ==============================================
CREATE TABLE Guest (
    GuestID       INT,
    First_Name    VARCHAR(50)   NOT NULL,
    Last_Name     VARCHAR(50)   NOT NULL,
    Email         VARCHAR(100)  NOT NULL UNIQUE,
    Phone         VARCHAR(20),
    Date_of_Birth DATE,
    PRIMARY KEY (GuestID)
);

-- ==============================================
-- SECTION 5: ROOM
-- ==============================================
CREATE TABLE Room (
    RoomID      INT,
    Room_Type   VARCHAR(50)     NOT NULL CHECK (Room_Type IN ('Standard', 'Deluxe', 'Suite')),
    Floor       INT             NOT NULL,
    Base_Price  DECIMAL(10,2)   NOT NULL,
    Room_Status VARCHAR(50)     NOT NULL CHECK (Room_Status IN ('Available', 'Occupied', 'Under Maintenance')),
    PRIMARY KEY (RoomID)
);

-- ==============================================
-- SECTION 6: BOOKING
-- ==============================================
CREATE TABLE Booking (
    BookingID       INT,
    Booking_Date    DATE            NOT NULL,
    Number_of_Guest INT             NOT NULL CHECK (Number_of_Guest >= 1),
    Total_Amount    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    Booking_Status  VARCHAR(50)     NOT NULL CHECK (Booking_Status IN ('Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled')),
    GuestID         INT             NOT NULL,
    PRIMARY KEY (BookingID),
    FOREIGN KEY (GuestID) REFERENCES Guest(GuestID)
);

-- ==============================================
-- SECTION 7: BOOKING_ROOM
-- ==============================================
CREATE TABLE Booking_Room (
    BookingID      INT            NOT NULL,
    RoomID         INT            NOT NULL,
    Check_in_Date  DATE           NOT NULL,
    Check_out_Date DATE           NOT NULL,
    Room_Price     DECIMAL(10,2)  NOT NULL,
    PRIMARY KEY (BookingID, RoomID),
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
    FOREIGN KEY (RoomID)    REFERENCES Room(RoomID),
    CHECK (Check_out_Date > Check_in_Date)
);

-- ==============================================
-- SECTION 8: PAYMENT
-- ==============================================
CREATE TABLE Payment (
    PaymentID      INT,
    Amount         DECIMAL(10,2)  NOT NULL CHECK (Amount > 0),
    Payment_Date   DATE           NOT NULL,
    Payment_Status VARCHAR(50)    NOT NULL CHECK (Payment_Status IN ('Pending', 'Completed', 'Refunded')),
    Payment_Method VARCHAR(50)    NOT NULL CHECK (Payment_Method IN ('Cash', 'Card', 'Online Transfer', 'eSewa')),
    BookingID      INT            NOT NULL,
    PRIMARY KEY (PaymentID),
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID)
);

-- ==============================================
-- SECTION 9: SERVICE
-- ==============================================
CREATE TABLE Service (
    ServiceID    INT,
    Service_Name VARCHAR(150)   NOT NULL,
    Service_Type VARCHAR(100)   NOT NULL,
    Base_Charge  DECIMAL(10,2)  NOT NULL CHECK (Base_Charge >= 0),
    Description  TEXT,
    PRIMARY KEY (ServiceID)
);

-- ==============================================
-- SECTION 10: SERVICE_ORDER
-- ==============================================
CREATE TABLE Service_Order (
    OrderID        INT,
    Order_DateTime TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Quantity       INT            NOT NULL DEFAULT 1 CHECK (Quantity >= 1),
    Amount         DECIMAL(10,2)  NOT NULL CHECK (Amount >= 0),
    Status         VARCHAR(50)    NOT NULL CHECK (Status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    BookingID      INT            NOT NULL,
    ServiceID      INT            NOT NULL,
    PRIMARY KEY (OrderID),
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
    FOREIGN KEY (ServiceID) REFERENCES Service(ServiceID)
);

-- ==============================================
-- SECTION 11: MAINTENANCE_REQUEST
-- ==============================================
CREATE TABLE Maintenance_Request (
    RequestID         INT,
    Request_Date      DATE        NOT NULL,
    Issue_Description TEXT        NOT NULL,
    Priority          VARCHAR(20) NOT NULL CHECK (Priority IN ('Low', 'Medium', 'High', 'Critical')),
    Status            VARCHAR(50) NOT NULL CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    RoomID            INT         NOT NULL,
    StaffID           INT         NOT NULL,
    PRIMARY KEY (RequestID),
    FOREIGN KEY (RoomID)  REFERENCES Room(RoomID),
    FOREIGN KEY (StaffID) REFERENCES Staff(StaffID)
);
