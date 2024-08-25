

---------------------------------------------------------------- CREATE TABLES
----------------------------------------------------------------
----------------------------------------------------------------
------------------------------CREATE TABLES---------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------



CREATE TABLE Questions (
	serialNum INT identity(1,1) primary key,
    Id INT,
    AcceptedAnswerId INT,
    CreationDate DATETIME,
    DeletionDate DATETIME,
    Score INT,
    ViewCount INT,
    Body NVARCHAR(MAX),
    OwnerUserId INT,
    OwnerDisplayName NVARCHAR(40),
    LastEditorUserId INT,
    LastEditorDisplayName NVARCHAR(40),
    LastEditDate DATETIME,
    LastActivityDate DATETIME,
    Title NVARCHAR(250),
    Tags NVARCHAR(4000),
    AnswerCount INT,
    CommentCount INT,
    FavoriteCount INT,
    ClosedDate DATETIME,
    CommunityOwnedDate DATETIME,
    ContentLicense VARCHAR(30)
);


CREATE TABLE Answers (
	serialNum INT identity(1,1) primary key,
    Id INT,
    CreationDate DATETIME,
    DeletionDate DATETIME,
    Score INT,
    ParentId INT,
    ViewCount INT,
    Body NVARCHAR(MAX),
    OwnerUserId INT,
    OwnerDisplayName NVARCHAR(40),
    LastEditorUserId INT,
    LastEditorDisplayName NVARCHAR(40),
    LastEditDate DATETIME,
    LastActivityDate DATETIME,
    Title NVARCHAR(250),
    ClosedDate DATETIME,
    CommunityOwnedDate DATETIME,
    ContentLicense VARCHAR(30),
	BatchName varchar (55),
	AnswerOrder int,
	NormalizedScore int,
	Label varchar(32),
	LabelRank int

);






CREATE TABLE Execution (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    batchID INT,
    QuestionID INT,
    AnswerID INT,
    AnswerIndex TINYINT,
    HumanRank INT,
    AiRank INT,
    AiExplnation NVARCHAR(MAX),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Execution
ADD ModelName NVARCHAR(55);

ALTER TABLE Execution
ADD PromptID INT;






CREATE TABLE Prompt (
    -- Primary key column with IDENTITY
    Id INT PRIMARY KEY IDENTITY(1,1),
    -- Other columns
    PromptTemplate NVARCHAR(max) NOT NULL,
    [timestamp] DATETime DEFAULT GETDATE(),
	UserName nvarchar(55),
	PromptName nvarchar(55),
	isActive bit 
	-- add names uniqe && isActive.
	
);

CREATE TABLE PromptToExecution (
	Id INT PRIMARY KEY IDENTITY(1,1),
	PromptId INT,
	ExId INT,
	FOREIGN KEY (ExId) REFERENCES Execution(ID),
    FOREIGN KEY (PromptId) REFERENCES Prompt(Id),

)




