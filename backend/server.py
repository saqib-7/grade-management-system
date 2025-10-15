from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone
import os
from uuid import uuid4

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.grade_management_db

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

# Pydantic Models
class Assignment(BaseModel):
    class_name: str
    subject: str

class Faculty(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    email: str
    employee_id: str
    assignments: List[Assignment]
    
    class Config:
        from_attributes = True

class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    student_id: str
    class_name: str
    enrolled_subjects: List[str]
    
    class Config:
        from_attributes = True

class Marks(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    student_id: str
    class_name: str
    subject: str
    faculty_email: str
    ct1: Optional[float] = None
    insem: Optional[float] = None
    ct2: Optional[float] = None
    total: Optional[float] = None
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    faculty: Faculty

class MarksUpdate(BaseModel):
    student_id: str
    class_name: str
    subject: str
    ct1: Optional[float] = None
    insem: Optional[float] = None
    ct2: Optional[float] = None

class StudentWithMarks(BaseModel):
    student: Student
    marks: Optional[Marks] = None

# Helper Functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_faculty(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        faculty = await db.faculties.find_one({"email": email})
        if faculty is None:
            raise HTTPException(status_code=401, detail="Faculty not found")
        
        return Faculty(**faculty)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize Sample Data
@app.on_event("startup")
async def startup_event():
    # Check if data already exists
    existing_faculty = await db.faculties.find_one()
    if existing_faculty:
        print("Sample data already exists")
        return
    
    print("Initializing sample data...")
    
    # Create sample faculties
    faculties = [
        {
            "id": str(uuid4()),
            "name": "Dr. Rajesh Kumar",
            "email": "rajesh@university.edu",
            "employee_id": "FAC001",
            "password": pwd_context.hash("password123"),
            "assignments": [
                {"class_name": "Class 10A", "subject": "Mathematics"},
                {"class_name": "Class 10B", "subject": "Mathematics"}
            ]
        },
        {
            "id": str(uuid4()),
            "name": "Dr. Priya Sharma",
            "email": "priya@university.edu",
            "employee_id": "FAC002",
            "password": pwd_context.hash("password123"),
            "assignments": [
                {"class_name": "Class 10A", "subject": "Physics"}
            ]
        },
        {
            "id": str(uuid4()),
            "name": "Prof. Amit Verma",
            "email": "amit@university.edu",
            "employee_id": "FAC003",
            "password": pwd_context.hash("password123"),
            "assignments": [
                {"class_name": "Class 10B", "subject": "Chemistry"},
                {"class_name": "Class 10A", "subject": "Chemistry"}
            ]
        }
    ]
    await db.faculties.insert_many(faculties)
    
    # Create sample students
    students_10a = [
        {
            "id": str(uuid4()),
            "name": "Aarav Patel",
            "student_id": "10A001",
            "class_name": "Class 10A",
            "enrolled_subjects": ["Mathematics", "Physics", "Chemistry"]
        },
        {
            "id": str(uuid4()),
            "name": "Ananya Singh",
            "student_id": "10A002",
            "class_name": "Class 10A",
            "enrolled_subjects": ["Mathematics", "Physics", "Chemistry"]
        },
        {
            "id": str(uuid4()),
            "name": "Rohan Gupta",
            "student_id": "10A003",
            "class_name": "Class 10A",
            "enrolled_subjects": ["Mathematics", "Physics", "Chemistry"]
        },
        {
            "id": str(uuid4()),
            "name": "Diya Reddy",
            "student_id": "10A004",
            "class_name": "Class 10A",
            "enrolled_subjects": ["Mathematics", "Physics", "Chemistry"]
        },
        {
            "id": str(uuid4()),
            "name": "Arjun Mehta",
            "student_id": "10A005",
            "class_name": "Class 10A",
            "enrolled_subjects": ["Mathematics", "Physics", "Chemistry"]
        }
    ]
    
    students_10b = [
        {
            "id": str(uuid4()),
            "name": "Kavya Joshi",
            "student_id": "10B001",
            "class_name": "Class 10B",
            "enrolled_subjects": ["Mathematics", "Chemistry"]
        },
        {
            "id": str(uuid4()),
            "name": "Vihaan Desai",
            "student_id": "10B002",
            "class_name": "Class 10B",
            "enrolled_subjects": ["Mathematics", "Chemistry"]
        },
        {
            "id": str(uuid4()),
            "name": "Ishaan Kapoor",
            "student_id": "10B003",
            "class_name": "Class 10B",
            "enrolled_subjects": ["Mathematics", "Chemistry"]
        },
        {
            "id": str(uuid4()),
            "name": "Saanvi Nair",
            "student_id": "10B004",
            "class_name": "Class 10B",
            "enrolled_subjects": ["Mathematics", "Chemistry"]
        }
    ]
    
    await db.students.insert_many(students_10a + students_10b)
    
    print("Sample data initialized successfully")
    print("\nSample Faculty Credentials:")
    print("1. Email: rajesh@university.edu | Password: password123 | Teaches: Math (10A, 10B)")
    print("2. Email: priya@university.edu | Password: password123 | Teaches: Physics (10A)")
    print("3. Email: amit@university.edu | Password: password123 | Teaches: Chemistry (10A, 10B)")

# API Endpoints
@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    faculty = await db.faculties.find_one({"email": request.email})
    if not faculty:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not pwd_context.verify(request.password, faculty["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": faculty["email"]})
    
    # Remove password from response
    faculty.pop("password")
    
    return LoginResponse(
        token=token,
        faculty=Faculty(**faculty)
    )

@app.get("/api/faculty/me", response_model=Faculty)
async def get_faculty_info(current_faculty: Faculty = Depends(get_current_faculty)):
    return current_faculty

@app.get("/api/students", response_model=List[StudentWithMarks])
async def get_students_with_marks(
    class_name: str,
    subject: str,
    current_faculty: Faculty = Depends(get_current_faculty)
):
    # Check if faculty is assigned to this class-subject combination
    is_assigned = any(
        a.class_name == class_name and a.subject == subject 
        for a in current_faculty.assignments
    )
    
    if not is_assigned:
        raise HTTPException(
            status_code=403, 
            detail="You are not assigned to teach this subject in this class"
        )
    
    # Get students enrolled in this subject for this class
    students_cursor = db.students.find({
        "class_name": class_name,
        "enrolled_subjects": subject
    })
    students = await students_cursor.to_list(length=None)
    
    # Get marks for these students
    result = []
    for student in students:
        marks = await db.marks.find_one({
            "student_id": student["id"],
            "class_name": class_name,
            "subject": subject
        })
        
        result.append(StudentWithMarks(
            student=Student(**student),
            marks=Marks(**marks) if marks else None
        ))
    
    return result

@app.post("/api/marks")
async def save_marks(
    marks_update: MarksUpdate,
    current_faculty: Faculty = Depends(get_current_faculty)
):
    # Check if faculty is assigned to this class-subject combination
    is_assigned = any(
        a.class_name == marks_update.class_name and a.subject == marks_update.subject 
        for a in current_faculty.assignments
    )
    
    if not is_assigned:
        raise HTTPException(
            status_code=403, 
            detail="You are not assigned to teach this subject in this class"
        )
    
    # Validate marks
    if marks_update.ct1 is not None and (marks_update.ct1 < 0 or marks_update.ct1 > 30):
        raise HTTPException(status_code=400, detail="CT1 marks must be between 0 and 30")
    if marks_update.insem is not None and (marks_update.insem < 0 or marks_update.insem > 30):
        raise HTTPException(status_code=400, detail="Insem marks must be between 0 and 30")
    if marks_update.ct2 is not None and (marks_update.ct2 < 0 or marks_update.ct2 > 70):
        raise HTTPException(status_code=400, detail="CT2 marks must be between 0 and 70")
    
    # Calculate total
    total = 0
    if marks_update.ct1 is not None:
        total += marks_update.ct1
    if marks_update.insem is not None:
        total += marks_update.insem
    if marks_update.ct2 is not None:
        total += marks_update.ct2
    
    # Check if marks already exist
    existing_marks = await db.marks.find_one({
        "student_id": marks_update.student_id,
        "class_name": marks_update.class_name,
        "subject": marks_update.subject
    })
    
    marks_data = {
        "student_id": marks_update.student_id,
        "class_name": marks_update.class_name,
        "subject": marks_update.subject,
        "faculty_email": current_faculty.email,
        "ct1": marks_update.ct1,
        "insem": marks_update.insem,
        "ct2": marks_update.ct2,
        "total": total
    }
    
    if existing_marks:
        # Update existing marks
        await db.marks.update_one(
            {"id": existing_marks["id"]},
            {"$set": marks_data}
        )
        marks_data["id"] = existing_marks["id"]
    else:
        # Create new marks entry
        marks_data["id"] = str(uuid4())
        await db.marks.insert_one(marks_data)
    
    return {"message": "Marks saved successfully", "marks": marks_data}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}