import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

# FIX: USERNAME is a reserved OS env var on Windows/Linux — use DB_USER instead
# Update your .env file: change USERNAME=... to DB_USER=...
user     = os.getenv("DB_USER")
password = os.getenv("PASSWORD")

app = Flask(__name__)
CORS(app)

DB_CONFIG = {
    "host":     "localhost",
    "user":     user,
    "password": password,
    "database": "Hotel_Management"
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ──────────────────────────────────────────────
# SECTION 1: ROLES
# ──────────────────────────────────────────────

@app.route("/roles", methods=["GET"])
def get_roles():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Roles")
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/roles/<int:role_id>", methods=["GET"])
def get_role(role_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Roles WHERE RoleID = %s", (role_id,))
        role = cursor.fetchone()
        if not role:
            return jsonify({"error": "Role not found"}), 404
        return jsonify(role), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/roles", methods=["POST"])
def create_role():
    data = request.get_json()
    if not data or not all(k in data for k in ("RoleID","Role_Name","Base_Salary")):
        return jsonify({"error": "Missing required fields: RoleID, Role_Name, Base_Salary"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Roles (RoleID, Role_Name, Base_Salary) VALUES (%s, %s, %s)",
            (data["RoleID"], data["Role_Name"], data["Base_Salary"])
        )
        conn.commit()
        return jsonify({"message": "Role created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/roles/<int:role_id>", methods=["PUT"])
def update_role(role_id):
    data = request.get_json()
    if not data or not all(k in data for k in ("Role_Name","Base_Salary")):
        return jsonify({"error": "Missing required fields: Role_Name, Base_Salary"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Roles SET Role_Name=%s, Base_Salary=%s WHERE RoleID=%s",
            (data["Role_Name"], data["Base_Salary"], role_id)
        )
        conn.commit()
        return jsonify({"message": "Role updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/roles/<int:role_id>", methods=["DELETE"])
def delete_role(role_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Roles WHERE RoleID = %s", (role_id,))
        conn.commit()
        return jsonify({"message": "Role deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 2: DEPARTMENT
# ──────────────────────────────────────────────

@app.route("/departments", methods=["GET"])
def get_departments():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT d.*, s.First_Name AS Manager_First, s.Last_Name AS Manager_Last
            FROM Department d LEFT JOIN Staff s ON d.ManagerId = s.StaffID
        """)
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/departments/<int:dept_id>", methods=["GET"])
def get_department(dept_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT d.*, s.First_Name AS Manager_First, s.Last_Name AS Manager_Last
            FROM Department d LEFT JOIN Staff s ON d.ManagerId = s.StaffID
            WHERE d.DeptID = %s
        """, (dept_id,))
        dept = cursor.fetchone()
        if not dept:
            return jsonify({"error": "Department not found"}), 404
        return jsonify(dept), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/departments", methods=["POST"])
def create_department():
    data = request.get_json()
    if not data or not all(k in data for k in ("DeptID","Dept_Name")):
        return jsonify({"error": "Missing required fields: DeptID, Dept_Name"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Department (DeptID, Dept_Name, ManagerId) VALUES (%s, %s, %s)",
            (data["DeptID"], data["Dept_Name"], data.get("ManagerId"))
        )
        conn.commit()
        return jsonify({"message": "Department created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/departments/<int:dept_id>", methods=["PUT"])
def update_department(dept_id):
    data = request.get_json()
    if not data or "Dept_Name" not in data:
        return jsonify({"error": "Missing required field: Dept_Name"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Department SET Dept_Name=%s, ManagerId=%s WHERE DeptID=%s",
            (data["Dept_Name"], data.get("ManagerId"), dept_id)
        )
        conn.commit()
        return jsonify({"message": "Department updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/departments/<int:dept_id>", methods=["DELETE"])
def delete_department(dept_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Department WHERE DeptID = %s", (dept_id,))
        conn.commit()
        return jsonify({"message": "Department deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 3: STAFF
# ──────────────────────────────────────────────

@app.route("/staff", methods=["GET"])
def get_all_staff():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.*, d.Dept_Name, r.Role_Name
            FROM Staff s
            JOIN Department d ON s.DeptID = d.DeptID
            JOIN Roles r ON s.RoleId = r.RoleID
        """)
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/staff/<int:staff_id>", methods=["GET"])
def get_staff(staff_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.*, d.Dept_Name, r.Role_Name
            FROM Staff s
            JOIN Department d ON s.DeptID = d.DeptID
            JOIN Roles r ON s.RoleId = r.RoleID
            WHERE s.StaffID = %s
        """, (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            return jsonify({"error": "Staff not found"}), 404
        return jsonify(staff), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/staff", methods=["POST"])
def create_staff():
    data = request.get_json()
    required = ("StaffID","First_Name","Last_Name","Email","Hire_Date","Salary","DeptID","RoleId")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Staff (StaffID, First_Name, Last_Name, Email, Phone, Hire_Date, Salary, DeptID, RoleId)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (data["StaffID"], data["First_Name"], data["Last_Name"], data["Email"],
              data.get("Phone"), data["Hire_Date"], data["Salary"], data["DeptID"], data["RoleId"]))
        conn.commit()
        return jsonify({"message": "Staff created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/staff/<int:staff_id>", methods=["PUT"])
def update_staff(staff_id):
    data = request.get_json()
    required = ("First_Name","Last_Name","Email","Hire_Date","Salary","DeptID","RoleId")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Staff SET First_Name=%s, Last_Name=%s, Email=%s, Phone=%s,
            Hire_Date=%s, Salary=%s, DeptID=%s, RoleId=%s WHERE StaffID=%s
        """, (data["First_Name"], data["Last_Name"], data["Email"], data.get("Phone"),
              data["Hire_Date"], data["Salary"], data["DeptID"], data["RoleId"], staff_id))
        conn.commit()
        return jsonify({"message": "Staff updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/staff/<int:staff_id>", methods=["DELETE"])
def delete_staff(staff_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Staff WHERE StaffID = %s", (staff_id,))
        conn.commit()
        return jsonify({"message": "Staff deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 4: GUEST
# ──────────────────────────────────────────────

@app.route("/guests", methods=["GET"])
def get_guests():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Guest")
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/guests/<int:guest_id>", methods=["GET"])
def get_guest(guest_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Guest WHERE GuestID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"error": "Guest not found"}), 404
        return jsonify(guest), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/guests", methods=["POST"])
def create_guest():
    data = request.get_json()
    required = ("GuestID","First_Name","Last_Name","Email")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Guest (GuestID, First_Name, Last_Name, Email, Phone, Date_of_Birth)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data["GuestID"], data["First_Name"], data["Last_Name"],
              data["Email"], data.get("Phone"), data.get("Date_of_Birth")))
        conn.commit()
        return jsonify({"message": "Guest created", "GuestID": data["GuestID"]}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/guests/<int:guest_id>", methods=["PUT"])
def update_guest(guest_id):
    data = request.get_json()
    required = ("First_Name","Last_Name","Email")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Guest SET First_Name=%s, Last_Name=%s, Email=%s, Phone=%s, Date_of_Birth=%s
            WHERE GuestID=%s
        """, (data["First_Name"], data["Last_Name"], data["Email"],
              data.get("Phone"), data.get("Date_of_Birth"), guest_id))
        conn.commit()
        return jsonify({"message": "Guest updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/guests/<int:guest_id>", methods=["DELETE"])
def delete_guest(guest_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Guest WHERE GuestID = %s", (guest_id,))
        conn.commit()
        return jsonify({"message": "Guest deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 5: ROOM
# ──────────────────────────────────────────────

@app.route("/rooms", methods=["GET"])
def get_rooms():
    status = request.args.get("status")
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        if status:
            cursor.execute("SELECT * FROM Room WHERE Room_Status = %s", (status,))
        else:
            cursor.execute("SELECT * FROM Room")
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/rooms/<int:room_id>", methods=["GET"])
def get_room(room_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Room WHERE RoomID = %s", (room_id,))
        room = cursor.fetchone()
        if not room:
            return jsonify({"error": "Room not found"}), 404
        return jsonify(room), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/rooms", methods=["POST"])
def create_room():
    data = request.get_json()
    required = ("RoomID","Room_Type","Floor","Base_Price","Room_Status")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Room (RoomID, Room_Type, Floor, Base_Price, Room_Status) VALUES (%s, %s, %s, %s, %s)",
            (data["RoomID"], data["Room_Type"], data["Floor"], data["Base_Price"], data["Room_Status"])
        )
        conn.commit()
        return jsonify({"message": "Room created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/rooms/<int:room_id>", methods=["PUT"])
def update_room(room_id):
    data = request.get_json()
    required = ("Room_Type","Floor","Base_Price","Room_Status")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Room SET Room_Type=%s, Floor=%s, Base_Price=%s, Room_Status=%s WHERE RoomID=%s",
            (data["Room_Type"], data["Floor"], data["Base_Price"], data["Room_Status"], room_id)
        )
        conn.commit()
        return jsonify({"message": "Room updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/rooms/<int:room_id>/status", methods=["PATCH"])
def update_room_status(room_id):
    data = request.get_json()
    if not data or "Room_Status" not in data:
        return jsonify({"error": "Missing required field: Room_Status"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE Room SET Room_Status=%s WHERE RoomID=%s", (data["Room_Status"], room_id))
        conn.commit()
        return jsonify({"message": "Room status updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/rooms/<int:room_id>", methods=["DELETE"])
def delete_room(room_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Room WHERE RoomID = %s", (room_id,))
        conn.commit()
        return jsonify({"message": "Room deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 6: BOOKING
# ──────────────────────────────────────────────

@app.route("/bookings", methods=["GET"])
def get_bookings():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT b.*, g.First_Name, g.Last_Name, g.Email,
                   br.RoomID, br.Check_in_Date, br.Check_out_Date, br.Room_Price
            FROM Booking b
            JOIN Guest g ON b.GuestID = g.GuestID
            LEFT JOIN Booking_Room br ON b.BookingID = br.BookingID
        """)
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/bookings/<int:booking_id>", methods=["GET"])
def get_booking(booking_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT b.*, g.First_Name, g.Last_Name, g.Email,
                   br.RoomID, br.Check_in_Date, br.Check_out_Date, br.Room_Price
            FROM Booking b
            JOIN Guest g ON b.GuestID = g.GuestID
            LEFT JOIN Booking_Room br ON b.BookingID = br.BookingID
            WHERE b.BookingID = %s
        """, (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        return jsonify(booking), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/bookings", methods=["POST"])
def create_booking():
    data = request.get_json()
    required = ("BookingID","Booking_Date","Number_of_Guest","Booking_Status","GuestID")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Booking (BookingID, Booking_Date, Number_of_Guest, Total_Amount, Booking_Status, GuestID)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data["BookingID"], data["Booking_Date"], data["Number_of_Guest"],
              data.get("Total_Amount", 0.00), data["Booking_Status"], data["GuestID"]))
        conn.commit()
        return jsonify({"message": "Booking created", "BookingID": data["BookingID"]}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/bookings/<int:booking_id>", methods=["PUT"])
def update_booking(booking_id):
    data = request.get_json()
    required = ("Booking_Date","Number_of_Guest","Total_Amount","Booking_Status","GuestID")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Booking SET Booking_Date=%s, Number_of_Guest=%s, Total_Amount=%s,
            Booking_Status=%s, GuestID=%s WHERE BookingID=%s
        """, (data["Booking_Date"], data["Number_of_Guest"], data["Total_Amount"],
              data["Booking_Status"], data["GuestID"], booking_id))
        conn.commit()
        return jsonify({"message": "Booking updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/bookings/<int:booking_id>/status", methods=["PATCH"])
def update_booking_status(booking_id):
    data = request.get_json()
    if not data or "Booking_Status" not in data:
        return jsonify({"error": "Missing required field: Booking_Status"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Booking SET Booking_Status=%s WHERE BookingID=%s",
            (data["Booking_Status"], booking_id)
        )
        conn.commit()
        return jsonify({"message": "Booking status updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/bookings/<int:booking_id>", methods=["DELETE"])
def delete_booking(booking_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Booking WHERE BookingID = %s", (booking_id,))
        conn.commit()
        return jsonify({"message": "Booking deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 7: BOOKING_ROOM
# ──────────────────────────────────────────────

@app.route("/booking-rooms", methods=["GET"])
def get_booking_rooms():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT br.*, r.Room_Type, r.Floor, b.Booking_Status
            FROM Booking_Room br
            JOIN Room r ON br.RoomID = r.RoomID
            JOIN Booking b ON br.BookingID = b.BookingID
        """)
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/booking-rooms/<int:booking_id>", methods=["GET"])
def get_rooms_by_booking(booking_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT br.*, r.Room_Type, r.Floor
            FROM Booking_Room br JOIN Room r ON br.RoomID = r.RoomID
            WHERE br.BookingID = %s
        """, (booking_id,))
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/booking-rooms", methods=["POST"])
def assign_room_to_booking():
    data = request.get_json()
    required = ("BookingID","RoomID","Check_in_Date","Check_out_Date","Room_Price")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Booking_Room (BookingID, RoomID, Check_in_Date, Check_out_Date, Room_Price)
            VALUES (%s, %s, %s, %s, %s)
        """, (data["BookingID"], data["RoomID"], data["Check_in_Date"],
              data["Check_out_Date"], data["Room_Price"]))
        conn.commit()
        return jsonify({"message": "Room assigned to booking"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/booking-rooms/<int:booking_id>/<int:room_id>", methods=["PUT"])
def update_booking_room(booking_id, room_id):
    data = request.get_json()
    required = ("Check_in_Date","Check_out_Date","Room_Price")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Booking_Room SET Check_in_Date=%s, Check_out_Date=%s, Room_Price=%s
            WHERE BookingID=%s AND RoomID=%s
        """, (data["Check_in_Date"], data["Check_out_Date"], data["Room_Price"], booking_id, room_id))
        conn.commit()
        return jsonify({"message": "Booking room updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/booking-rooms/<int:booking_id>/<int:room_id>", methods=["DELETE"])
def remove_room_from_booking(booking_id, room_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM Booking_Room WHERE BookingID=%s AND RoomID=%s", (booking_id, room_id)
        )
        conn.commit()
        return jsonify({"message": "Room removed from booking"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 8: PAYMENT
# ──────────────────────────────────────────────

@app.route("/payments", methods=["GET"])
def get_payments():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.*, b.Booking_Status, b.GuestID
            FROM Payment p JOIN Booking b ON p.BookingID = b.BookingID
        """)
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/payments/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Payment WHERE PaymentID = %s", (payment_id,))
        payment = cursor.fetchone()
        if not payment:
            return jsonify({"error": "Payment not found"}), 404
        return jsonify(payment), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/payments/booking/<int:booking_id>", methods=["GET"])
def get_payments_by_booking(booking_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Payment WHERE BookingID = %s", (booking_id,))
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/payments", methods=["POST"])
def create_payment():
    data = request.get_json()
    required = ("PaymentID","Amount","Payment_Date","Payment_Status","Payment_Method","BookingID")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Payment (PaymentID, Amount, Payment_Date, Payment_Status, Payment_Method, BookingID)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data["PaymentID"], data["Amount"], data["Payment_Date"],
              data["Payment_Status"], data["Payment_Method"], data["BookingID"]))
        conn.commit()
        return jsonify({"message": "Payment recorded", "PaymentID": data["PaymentID"]}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/payments/<int:payment_id>/status", methods=["PATCH"])
def update_payment_status(payment_id):
    data = request.get_json()
    if not data or "Payment_Status" not in data:
        return jsonify({"error": "Missing required field: Payment_Status"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Payment SET Payment_Status=%s WHERE PaymentID=%s",
            (data["Payment_Status"], payment_id)
        )
        conn.commit()
        return jsonify({"message": "Payment status updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/payments/<int:payment_id>", methods=["DELETE"])
def delete_payment(payment_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Payment WHERE PaymentID = %s", (payment_id,))
        conn.commit()
        return jsonify({"message": "Payment deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 9: SERVICE
# ──────────────────────────────────────────────

@app.route("/services", methods=["GET"])
def get_services():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Service")
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/services/<int:service_id>", methods=["GET"])
def get_service(service_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Service WHERE ServiceID = %s", (service_id,))
        service = cursor.fetchone()
        if not service:
            return jsonify({"error": "Service not found"}), 404
        return jsonify(service), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/services", methods=["POST"])
def create_service():
    data = request.get_json()
    required = ("ServiceID","Service_Name","Service_Type","Base_Charge")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Service (ServiceID, Service_Name, Service_Type, Base_Charge, Description)
            VALUES (%s, %s, %s, %s, %s)
        """, (data["ServiceID"], data["Service_Name"], data["Service_Type"],
              data["Base_Charge"], data.get("Description")))
        conn.commit()
        return jsonify({"message": "Service created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/services/<int:service_id>", methods=["PUT"])
def update_service(service_id):
    data = request.get_json()
    required = ("Service_Name","Service_Type","Base_Charge")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Service SET Service_Name=%s, Service_Type=%s, Base_Charge=%s, Description=%s
            WHERE ServiceID=%s
        """, (data["Service_Name"], data["Service_Type"], data["Base_Charge"],
              data.get("Description"), service_id))
        conn.commit()
        return jsonify({"message": "Service updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/services/<int:service_id>", methods=["DELETE"])
def delete_service(service_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Service WHERE ServiceID = %s", (service_id,))
        conn.commit()
        return jsonify({"message": "Service deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 10: SERVICE_ORDER
# ──────────────────────────────────────────────

@app.route("/service-orders", methods=["GET"])
def get_service_orders():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT so.*, s.Service_Name, s.Service_Type
            FROM Service_Order so JOIN Service s ON so.ServiceID = s.ServiceID
        """)
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/service-orders/<int:order_id>", methods=["GET"])
def get_service_order(order_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT so.*, s.Service_Name, s.Service_Type
            FROM Service_Order so JOIN Service s ON so.ServiceID = s.ServiceID
            WHERE so.OrderID = %s
        """, (order_id,))
        order = cursor.fetchone()
        if not order:
            return jsonify({"error": "Order not found"}), 404
        return jsonify(order), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/service-orders/booking/<int:booking_id>", methods=["GET"])
def get_orders_by_booking(booking_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT so.*, s.Service_Name
            FROM Service_Order so JOIN Service s ON so.ServiceID = s.ServiceID
            WHERE so.BookingID = %s
        """, (booking_id,))
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/service-orders", methods=["POST"])
def create_service_order():
    data = request.get_json()
    required = ("OrderID","Amount","Status","BookingID","ServiceID")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Service_Order (OrderID, Quantity, Amount, Status, BookingID, ServiceID)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data["OrderID"], data.get("Quantity", 1), data["Amount"],
              data["Status"], data["BookingID"], data["ServiceID"]))
        conn.commit()
        return jsonify({"message": "Service order placed"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/service-orders/<int:order_id>/status", methods=["PATCH"])
def update_service_order_status(order_id):
    data = request.get_json()
    if not data or "Status" not in data:
        return jsonify({"error": "Missing required field: Status"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Service_Order SET Status=%s WHERE OrderID=%s", (data["Status"], order_id)
        )
        conn.commit()
        return jsonify({"message": "Order status updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/service-orders/<int:order_id>", methods=["DELETE"])
def delete_service_order(order_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Service_Order WHERE OrderID = %s", (order_id,))
        conn.commit()
        return jsonify({"message": "Service order deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────
# SECTION 11: MAINTENANCE_REQUEST
# ──────────────────────────────────────────────

@app.route("/maintenance", methods=["GET"])
def get_maintenance_requests():
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT mr.*, r.Room_Type, r.Floor,
                   s.First_Name AS Staff_First, s.Last_Name AS Staff_Last
            FROM Maintenance_Request mr
            JOIN Room r ON mr.RoomID = r.RoomID
            JOIN Staff s ON mr.StaffID = s.StaffID
        """)
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/maintenance/<int:request_id>", methods=["GET"])
def get_maintenance_request(request_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT mr.*, r.Room_Type, r.Floor,
                   s.First_Name AS Staff_First, s.Last_Name AS Staff_Last
            FROM Maintenance_Request mr
            JOIN Room r ON mr.RoomID = r.RoomID
            JOIN Staff s ON mr.StaffID = s.StaffID
            WHERE mr.RequestID = %s
        """, (request_id,))
        req = cursor.fetchone()
        if not req:
            return jsonify({"error": "Request not found"}), 404
        return jsonify(req), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/maintenance/room/<int:room_id>", methods=["GET"])
def get_maintenance_by_room(room_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Maintenance_Request WHERE RoomID = %s", (room_id,))
        return jsonify(cursor.fetchall()), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/maintenance", methods=["POST"])
def create_maintenance_request():
    data = request.get_json()
    required = ("RequestID","Request_Date","Issue_Description","Priority","Status","RoomID","StaffID")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Maintenance_Request (RequestID, Request_Date, Issue_Description, Priority, Status, RoomID, StaffID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data["RequestID"], data["Request_Date"], data["Issue_Description"],
              data["Priority"], data["Status"], data["RoomID"], data["StaffID"]))
        conn.commit()
        return jsonify({"message": "Maintenance request created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/maintenance/<int:request_id>", methods=["PUT"])
def update_maintenance_request(request_id):
    data = request.get_json()
    required = ("Issue_Description","Priority","Status","RoomID","StaffID")
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {', '.join(required)}"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Maintenance_Request
            SET Issue_Description=%s, Priority=%s, Status=%s, RoomID=%s, StaffID=%s
            WHERE RequestID=%s
        """, (data["Issue_Description"], data["Priority"], data["Status"],
              data["RoomID"], data["StaffID"], request_id))
        conn.commit()
        return jsonify({"message": "Maintenance request updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/maintenance/<int:request_id>/status", methods=["PATCH"])
def update_maintenance_status(request_id):
    data = request.get_json()
    if not data or "Status" not in data:
        return jsonify({"error": "Missing required field: Status"}), 400
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Maintenance_Request SET Status=%s WHERE RequestID=%s",
            (data["Status"], request_id)
        )
        conn.commit()
        return jsonify({"message": "Maintenance status updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()

@app.route("/maintenance/<int:request_id>", methods=["DELETE"])
def delete_maintenance_request(request_id):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Maintenance_Request WHERE RequestID = %s", (request_id,))
        conn.commit()
        return jsonify({"message": "Maintenance request deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


# ──────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
