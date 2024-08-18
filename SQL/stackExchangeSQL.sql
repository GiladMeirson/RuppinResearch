WITH HighScoredQuestions AS (
  SELECT TOP 10
    Id AS QuestionId,
    Title,
    CreationDate,
    Score AS QuestionScore,
    ViewCount,
    AnswerCount,
    FavoriteCount,
    Body AS QuestionBody,
    Tags
  FROM Posts
  WHERE PostTypeId = 1  -- שאלות
    AND CreationDate >= '2023-02-01'
     AND (
      Tags LIKE '%<javascript>%'
      OR Tags LIKE '%<react>%'
      OR Tags LIKE '%<html>%'
      OR Tags LIKE '%<css>%'
      OR Tags LIKE '%<c#>%'
      OR Tags LIKE '%<python>%'
    ) 
    AND AnswerCount > 2  -- מבטיח שיש לפחות תשובה אחת
  ORDER BY Score DESC, ViewCount DESC
),
TopAnswers AS (
  SELECT 
    a.ParentId AS QuestionId,
    a.Id AS AnswerId,
    a.Score AS AnswerScore,
    a.Body AS AnswerBody,
    a.CreationDate AS AnswerCreationDate,
    ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.Score DESC) AS AnswerRank
  FROM Posts a
  INNER JOIN HighScoredQuestions q ON a.ParentId = q.QuestionId
  WHERE a.PostTypeId = 2  -- תשובות
)
SELECT 
  q.QuestionId,
  q.Title,
  q.CreationDate AS QuestionCreationDate,
  q.QuestionScore,
  q.ViewCount,
  q.AnswerCount,
  q.FavoriteCount,
  q.QuestionBody,
  q.Tags,
  a.AnswerId,
  a.AnswerScore,
  a.AnswerBody,
  a.AnswerCreationDate
FROM HighScoredQuestions q
LEFT JOIN TopAnswers a ON q.QuestionId = a.QuestionId AND a.AnswerRank <= 3
ORDER BY q.QuestionScore DESC, q.QuestionId, a.AnswerRank







WITH FilteredQuestions AS (
  SELECT top 1000 q.Id AS QuestionId
  FROM Posts q
  WHERE 
    q.PostTypeId = 1
    AND q.Tags LIKE '%javascript%'
    AND (
      q.Tags LIKE '%react%' OR
      q.Tags LIKE '%html%' OR
      q.Tags LIKE '%json%' OR
      q.Tags LIKE '%css%' OR
      q.Tags LIKE '%c#%' OR
      q.Tags LIKE '%python%'
    )
    AND LEN(q.Body) <= 1000
    AND q.AnswerCount >= 3
),
RankedAnswers AS (
  SELECT 
    q.Id AS QuestionId,
    q.Title,
    q.CreationDate AS QuestionCreationDate,
    q.Score AS QuestionScore,
    q.ViewCount,
    q.AnswerCount,
    q.FavoriteCount,
    LEFT(q.Body, 500) AS QuestionBody,
    q.Tags,
    a.Id AS AnswerId,
    a.Score AS AnswerScore,
    LEFT(a.Body, 500) AS AnswerBody,
    a.CreationDate AS AnswerCreationDate,
    ROW_NUMBER() OVER (PARTITION BY q.Id ORDER BY a.Score DESC) AS AnswerRank
  FROM FilteredQuestions fq
  INNER JOIN Posts q ON fq.QuestionId = q.Id
  INNER JOIN Posts a ON q.Id = a.ParentId
  WHERE 
    a.PostTypeId = 2
    AND LEN(a.Body) <= 1000
),
QuestionsWithEnoughAnswers AS (
  SELECT QuestionId
  FROM RankedAnswers
  GROUP BY QuestionId
  HAVING COUNT(*) >= 3
)
SELECT TOP 1000 r.*
FROM RankedAnswers r
INNER JOIN QuestionsWithEnoughAnswers q ON r.QuestionId = q.QuestionId
WHERE r.AnswerRank <= 3
ORDER BY r.QuestionCreationDate DESC, r.QuestionId, r.AnswerRank


----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
DECLARE @startQuestionID AS int;
SET @startQuestionID = 5000000;

DECLARE @numAnswers AS int;
SET @numAnswers = 5;

DECLARE @MinGoodScore AS float;
SET @MinGoodScore = 32;

DECLARE @MaxMediumScore AS float;
SET @MaxMediumScore = 16;

DECLARE @MinMediumScore AS float;
SET @MinMediumScore = 8;

DECLARE @factor2 AS float;
DECLARE @factor3 AS float;
DECLARE @factor4 AS float;
DECLARE @factor5 AS float;

SET @factor2 = 1.479601;
SET @factor3 = 2.05682;
SET @factor4 = 2.823545;
SET @factor5 = 4.002532;

WITH QuestionsWithExactly5Answers AS (
  SELECT TOP 3000
    q.Id AS QuestionId
  FROM 
    Posts q
  WHERE 
    q.PostTypeId = 1 -- Questions only
    and q.Id > @startQuestionID
    AND @numAnswers = (SELECT COUNT(*) FROM Posts a WHERE a.ParentId = q.Id AND a.PostTypeId = 2)
  ORDER BY
    q.CreationDate
),
AnswersWithNormalizedScores AS (
  SELECT 
    a.Id AS AnswerId,
    a.ParentId AS QuestionId,
    a.Score AS OriginalScore,
    ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) AS AnswerOrder,
    CASE 
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 1 THEN a.Score
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 2 THEN a.Score * @factor2
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 3 THEN a.Score * @factor3
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 4 THEN a.Score * @factor4
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 5 THEN a.Score * @factor5
    END AS NormalizedScore,
    CAST(RAND(CHECKSUM(NEWID())) * 1000000 AS INT) AS RandomRank
  FROM 
    Posts a
  INNER JOIN QuestionsWithExactly5Answers q ON a.ParentId = q.QuestionId
  WHERE 
    a.PostTypeId = 2 -- Answers only
),
LabeledScores AS (
  SELECT 
    *,
    CASE
      WHEN NormalizedScore <= 0 THEN 'bad'
      WHEN NormalizedScore > @MinGoodScore THEN 'good'
      WHEN NormalizedScore BETWEEN @MinMediumScore AND @MaxMediumScore THEN 'medium'
    END AS Label,
    ROW_NUMBER() OVER (PARTITION BY QuestionId, 
                       CASE 
                         WHEN NormalizedScore <= 0 THEN 'bad'
                         WHEN NormalizedScore > @MinGoodScore THEN 'good'
                         WHEN NormalizedScore BETWEEN @MinMediumScore AND @MaxMediumScore THEN 'medium'
                       END
                       ORDER BY 
                         CASE 
                           WHEN NormalizedScore <= 0 THEN NormalizedScore
                           WHEN NormalizedScore > 32 THEN NormalizedScore
                           ELSE RandomRank
                         END,
                         CASE WHEN NormalizedScore <= 0 THEN RandomRank ELSE NULL END
    ) AS LabelRank
  FROM 
    AnswersWithNormalizedScores
),
FilteredQuestions AS (
  SELECT DISTINCT QuestionId
  FROM LabeledScores
  GROUP BY QuestionId
  HAVING 
    SUM(CASE WHEN Label = 'bad' THEN 1 ELSE 0 END) > 0
    AND SUM(CASE WHEN Label = 'good' THEN 1 ELSE 0 END) > 0
    AND SUM(CASE WHEN Label = 'medium' THEN 1 ELSE 0 END) > 0
)
SELECT 
  ls.QuestionId,
  ls.AnswerId,
  ls.AnswerOrder,
  ls.OriginalScore,
  ls.NormalizedScore,
  ls.Label
FROM 
  LabeledScores ls
INNER JOIN FilteredQuestions fq ON ls.QuestionId = fq.QuestionId
WHERE 
  ls.Label IS NOT NULL
  AND (
    (ls.Label = 'bad' AND ls.LabelRank = 1)
    OR (ls.Label = 'good' AND ls.LabelRank = 1)
    OR ls.Label = 'medium'
  )
ORDER BY
  ls.QuestionId,
  CASE ls.Label
    WHEN 'bad' THEN 1
    WHEN 'good' THEN 2
    WHEN 'medium' THEN 3
  END

-----------------------------------------------------------------
-----------------------------------------------------------------
-----------------------------------------------------------------
-----------------------------------------------------------------
-----------------------------------------------------------------
-----------------------------------------------------------------
-----------------------------------------------------------------
-----------------------------------------------------------------


DECLARE @startQuestionID AS int;
SET @startQuestionID = 5000000;

DECLARE @numAnswers AS int;
SET @numAnswers = 5;

DECLARE @MinGoodScore AS float;
SET @MinGoodScore = 32;

DECLARE @MaxMediumScore AS float;
SET @MaxMediumScore = 16;

DECLARE @MinMediumScore AS float;
SET @MinMediumScore = 8;

DECLARE @factor2 AS float;
DECLARE @factor3 AS float;
DECLARE @factor4 AS float;
DECLARE @factor5 AS float;

SET @factor2 = 1.479601;
SET @factor3 = 2.05682;
SET @factor4 = 2.823545;
SET @factor5 = 4.002532;

WITH QuestionsWithExactly5Answers AS (
  SELECT TOP 1000
    q.Id AS QId,
    q.AcceptedAnswerId AS QAcceptedAnswerId,
    q.CreationDate AS QCreationDate,
    q.DeletionDate AS QDeletionDate,
    q.Score AS QScore,
    q.ViewCount AS QViewCount,
    q.Body AS QBody,
    q.OwnerUserId AS QOwnerUserId,
    q.OwnerDisplayName AS QOwnerDisplayName,
    q.LastEditorUserId AS QLastEditorUserId,
    q.LastEditorDisplayName AS QLastEditorDisplayName,
    q.LastEditDate AS QLastEditDate,
    q.LastActivityDate AS QLastActivityDate,
    q.Title AS QTitle,
    q.Tags AS QTags,
    q.AnswerCount AS QAnswerCount,
    q.CommentCount AS QCommentCount,
    q.FavoriteCount AS QFavoriteCount,
    q.ClosedDate AS QClosedDate,
    q.CommunityOwnedDate AS QCommunityOwnedDate,
    q.ContentLicense AS QContentLicense
  FROM 
    Posts q
  WHERE 
    q.PostTypeId = 1 -- Questions only
    AND q.Id > @startQuestionID
    AND @numAnswers = (SELECT COUNT(*) FROM Posts a WHERE a.ParentId = q.Id AND a.PostTypeId = 2)
  ORDER BY
    q.CreationDate
),
AnswersWithNormalizedScores AS (
  SELECT 
    a.Id AS AId,
    a.AcceptedAnswerId AS AAcceptedAnswerId,
    a.CreationDate AS ACreationDate,
    a.DeletionDate AS ADeletionDate,
    a.Score AS AScore,
    a.ParentId AS AParentId,
    a.ViewCount AS AViewCount,
    a.Body AS ABody,
    a.OwnerUserId AS AOwnerUserId,
    a.OwnerDisplayName AS AOwnerDisplayName,
    a.LastEditorUserId AS ALastEditorUserId,
    a.LastEditorDisplayName AS ALastEditorDisplayName,
    a.LastEditDate AS ALastEditDate,
    a.LastActivityDate AS ALastActivityDate,
    a.Title AS ATitle,
    a.Tags AS ATags,
    a.AnswerCount AS AAnswerCount,
    a.CommentCount AS ACommentCount,
    a.FavoriteCount AS AFavoriteCount,
    a.ClosedDate AS AClosedDate,
    a.CommunityOwnedDate AS ACommunityOwnedDate,
    a.ContentLicense AS AContentLicense,
    q.*,
    ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) AS AnswerOrder,
    CASE 
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 1 THEN a.Score
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 2 THEN a.Score * @factor2
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 3 THEN a.Score * @factor3
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 4 THEN a.Score * @factor4
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 5 THEN a.Score * @factor5
    END AS NormalizedScore,
    CAST(RAND(CHECKSUM(NEWID())) * 1000000 AS INT) AS RandomRank
  FROM 
    Posts a
  INNER JOIN QuestionsWithExactly5Answers q ON a.ParentId = q.QId
  WHERE 
    a.PostTypeId = 2 -- Answers only
),
LabeledScores AS (
  SELECT 
    *,
    CASE
      WHEN NormalizedScore <= 0 THEN 'bad'
      WHEN NormalizedScore > @MinGoodScore THEN 'good'
      WHEN NormalizedScore BETWEEN @MinMediumScore AND @MaxMediumScore THEN 'medium'
      ELSE NULL
    END AS Label,
    ROW_NUMBER() OVER (PARTITION BY AParentId, 
                       CASE 
                         WHEN NormalizedScore <= 0 THEN 'bad'
                         WHEN NormalizedScore > @MinGoodScore THEN 'good'
                         WHEN NormalizedScore BETWEEN @MinMediumScore AND @MaxMediumScore THEN 'medium'
                         ELSE NULL
                       END
                       ORDER BY 
                         CASE 
                           WHEN NormalizedScore <= 0 THEN NormalizedScore
                           WHEN NormalizedScore > @MinGoodScore THEN NormalizedScore
                           ELSE RandomRank
                         END DESC,
                         CASE WHEN NormalizedScore <= 0 THEN RandomRank ELSE NULL END
    ) AS LabelRank
  FROM 
    AnswersWithNormalizedScores
),
FilteredQuestions AS (
  SELECT DISTINCT AParentId
  FROM LabeledScores
  GROUP BY AParentId
  HAVING 
    SUM(CASE WHEN Label = 'bad' THEN 1 ELSE 0 END) > 0
    AND SUM(CASE WHEN Label = 'good' THEN 1 ELSE 0 END) > 0
    AND SUM(CASE WHEN Label = 'medium' THEN 1 ELSE 0 END) > 0
)
SELECT TOP 100
  -- Question fields
  ls.QId,
  ls.QAcceptedAnswerId,
  ls.QCreationDate,
  ls.QDeletionDate,
  ls.QScore,
  ls.QViewCount,
  ls.QBody,
  ls.QOwnerUserId,
  ls.QOwnerDisplayName,
  ls.QLastEditorUserId,
  ls.QLastEditorDisplayName,
  ls.QLastEditDate,
  ls.QLastActivityDate,
  ls.QTitle,
  ls.QTags,
  ls.QAnswerCount,
  ls.QCommentCount,
  ls.QFavoriteCount,
  ls.QClosedDate,
  ls.QCommunityOwnedDate,
  ls.QContentLicense,
  
  -- Answer fields
  ls.AId,
  ls.AAcceptedAnswerId,
  ls.ACreationDate,
  ls.ADeletionDate,
  ls.AScore,
  ls.AParentId,
  ls.AViewCount,
  ls.ABody,
  ls.AOwnerUserId,
  ls.AOwnerDisplayName,
  ls.ALastEditorUserId,
  ls.ALastEditorDisplayName,
  ls.ALastEditDate,
  ls.ALastActivityDate,
  ls.ATitle,
  ls.ATags,
  ls.AAnswerCount,
  ls.ACommentCount,
  ls.AFavoriteCount,
  ls.AClosedDate,
  ls.ACommunityOwnedDate,
  ls.AContentLicense,
  
  -- Computed fields
  ls.AnswerOrder,
  ls.NormalizedScore,
  ls.RandomRank,
  ls.Label,
  ls.LabelRank
FROM 
  LabeledScores ls
INNER JOIN FilteredQuestions fq ON ls.AParentId = fq.AParentId
WHERE 
  ls.Label IS NOT NULL
  AND (
    (ls.Label = 'bad' AND ls.LabelRank = 1)
    OR (ls.Label = 'good' AND ls.LabelRank = 1)
    OR ls.Label = 'medium'
  )
ORDER BY
  ls.AParentId,
  CASE ls.Label
    WHEN 'bad' THEN 1
    WHEN 'good' THEN 2
    WHEN 'medium' THEN 3
  END,
  ls.NormalizedScore DESC








---------------------------------------------------------------- CREATE TABLES
----------------------------------------------------------------
----------------------------------------------------------------
------------------------------CREATE TABLES---------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------



-- CREATE TABLE Questions (
--     Id INT PRIMARY KEY,
--     AcceptedAnswerId INT,
--     CreationDate DATETIME,
--     DeletionDate DATETIME,
--     Score INT,
--     ViewCount INT,
--     Body NVARCHAR(MAX),
--     OwnerUserId INT,
--     OwnerDisplayName NVARCHAR(40),
--     LastEditorUserId INT,
--     LastEditorDisplayName NVARCHAR(40),
--     LastEditDate DATETIME,
--     LastActivityDate DATETIME,
--     Title NVARCHAR(250),
--     Tags NVARCHAR(4000),
--     AnswerCount INT,
--     CommentCount INT,
--     FavoriteCount INT,
--     ClosedDate DATETIME,
--     CommunityOwnedDate DATETIME,
--     ContentLicense VARCHAR(30)
-- );

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



---------------------------------------------------------------- SP
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------


USE [igroup193_test2]
GO
/****** Object:  StoredProcedure [dbo].[sp_insertToExecution]    Script Date: 02/08/2024 18:34:57 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Gilad Meirson>
-- Create date: <29/07/2024>
-- Description:	<saving execution for each run with LLm model>
-- =============================================
ALTER  PROCEDURE [dbo].[sp_insertToExecution]
	-- Add the parameters for the stored procedure here
	@batchID INT,
    @QuestionID INT,
    @AnswerID INT,
    @AnswerIndex TINYINT,
    @HumanRank INT,
    @AiRank INT,
    @AiExplnation NVARCHAR(MAX),
	@ModelName NVARCHAR(55),
	@temp int

AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	

    -- Insert statements for procedure here
	 INSERT INTO Execution (batchID, QuestionID, AnswerID, AnswerIndex, HumanRank, AiRank, AiExplnation,ModelName,temp)
    VALUES (@batchID, @QuestionID, @AnswerID, @AnswerIndex, @HumanRank, @AiRank, @AiExplnation,@ModelName,@temp);
    
    SELECT SCOPE_IDENTITY() AS NewRunID;
END


----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------

USE [igroup193_test2]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Gilad,,Meirson>
-- Create date: <01/08/24>
-- Description:	<to get all history of the execution with direct index difference>
-- =============================================
ALTER PROCEDURE [dbo].[spGetAllExecutaionScores]
AS
BEGIN

WITH GroupedAnswers AS (
    SELECT *,
        NTILE(3) OVER (PARTITION BY QuestionID ORDER BY timestamp) AS RunGroup
    FROM Execution
),
RankedAnswers AS (
    SELECT 
        QuestionID,
        RunGroup,
        AnswerID,
        ROW_NUMBER() OVER (PARTITION BY QuestionID, RunGroup ORDER BY HumanRank) AS HumanRank,
        ROW_NUMBER() OVER (PARTITION BY QuestionID, RunGroup ORDER BY AiRank) AS AiRank,
        ModelName,
        MAX(timestamp) OVER (PARTITION BY QuestionID, RunGroup) AS GroupTimestamp
    FROM GroupedAnswers
),
PositionDifference AS (
    SELECT 
        QuestionID,
        RunGroup,
        SUM(ABS(HumanRank - AiRank)) AS TotalPosDiff,
        MAX(ModelName) AS ModelName,
        MAX(GroupTimestamp) AS LastTimestamp
    FROM RankedAnswers
    GROUP BY QuestionID, RunGroup
),
LatestRun AS (
    SELECT QuestionID, MAX(RunGroup) AS MaxRunGroup
    FROM PositionDifference
    GROUP BY QuestionID
)
SELECT 
    pd.QuestionID,
    pd.RunGroup,
    pd.ModelName,
    pd.TotalPosDiff AS TotalPositionDifference
FROM PositionDifference pd
JOIN LatestRun lr ON pd.QuestionID = lr.QuestionID AND pd.RunGroup = lr.MaxRunGroup
ORDER BY pd.QuestionID, pd.RunGroup;
END


--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Gilad Meirson
-- Create date: 07/08/2024
-- Description:	To insert a Question
-- =============================================
CREATE PROCEDURE spInsertQuestion
    @AcceptedAnswerId INT = NULL,
    @CreationDate DATETIME,
    @DeletionDate DATETIME = NULL,
    @Score INT,
    @ViewCount INT,
    @Body NVARCHAR(MAX),
    @OwnerUserId INT,
    @OwnerDisplayName NVARCHAR(255) = NULL,
    @LastEditorUserId INT = NULL,
    @LastEditorDisplayName NVARCHAR(255) = NULL,
    @LastEditDate DATETIME = NULL,
    @LastActivityDate DATETIME,
    @Title NVARCHAR(255),
    @Tags NVARCHAR(255),
    @AnswerCount INT,
    @CommentCount INT,
    @FavoriteCount INT,
    @ClosedDate DATETIME = NULL,
    @CommunityOwnedDate DATETIME = NULL,
    @ContentLicense NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Questions (
        AcceptedAnswerId, CreationDate, DeletionDate, Score, ViewCount, Body, 
        OwnerUserId, OwnerDisplayName, LastEditorUserId, LastEditorDisplayName, 
        LastEditDate, LastActivityDate, Title, Tags, AnswerCount, CommentCount, 
        FavoriteCount, ClosedDate, CommunityOwnedDate, ContentLicense
    )
    VALUES (
        @AcceptedAnswerId, @CreationDate, @DeletionDate, @Score, @ViewCount, @Body, 
        @OwnerUserId, @OwnerDisplayName, @LastEditorUserId, @LastEditorDisplayName, 
        @LastEditDate, @LastActivityDate, @Title, @Tags, @AnswerCount, @CommentCount, 
        @FavoriteCount, @ClosedDate, @CommunityOwnedDate, @ContentLicense
    );

    -- Return the ID of the newly inserted question
    SELECT SCOPE_IDENTITY() AS NewQuestionId;
END
GO










----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
DECLARE @startQuestionID AS int;
SET @startQuestionID = 5000000;

DECLARE @numAnswers AS int;
SET @numAnswers = 5;

DECLARE @MinGoodScore AS float;
SET @MinGoodScore = 32;

DECLARE @MaxMediumScore AS float;
SET @MaxMediumScore = 16;

DECLARE @MinMediumScore AS float;
SET @MinMediumScore = 8;

DECLARE @factor2 AS float;
DECLARE @factor3 AS float;
DECLARE @factor4 AS float;
DECLARE @factor5 AS float;

SET @factor2 = 1.479601;
SET @factor3 = 2.05682;
SET @factor4 = 2.823545;
SET @factor5 = 4.002532;

WITH QuestionsWithExactly5Answers AS (
  SELECT TOP 1000
    q.Id AS QId,
    q.AcceptedAnswerId AS QAcceptedAnswerId,
    q.CreationDate AS QCreationDate,
    q.DeletionDate AS QDeletionDate,
    q.Score AS QScore,
    q.ViewCount AS QViewCount,
    q.Body AS QBody,
    q.OwnerUserId AS QOwnerUserId,
    q.OwnerDisplayName AS QOwnerDisplayName,
    q.LastEditorUserId AS QLastEditorUserId,
    q.LastEditorDisplayName AS QLastEditorDisplayName,
    q.LastEditDate AS QLastEditDate,
    q.LastActivityDate AS QLastActivityDate,
    q.Title AS QTitle,
    q.Tags AS QTags,
    q.AnswerCount AS QAnswerCount,
    q.CommentCount AS QCommentCount,
    q.FavoriteCount AS QFavoriteCount,
    q.ClosedDate AS QClosedDate,
    q.CommunityOwnedDate AS QCommunityOwnedDate,
    q.ContentLicense AS QContentLicense
  FROM 
    Posts q
  WHERE 
    q.PostTypeId = 1 -- Questions only
    AND q.Id > @startQuestionID
    AND @numAnswers = (SELECT COUNT(*) FROM Posts a WHERE a.ParentId = q.Id AND a.PostTypeId = 2)
  ORDER BY
    q.CreationDate
),
AnswersWithNormalizedScores AS (
  SELECT 
    a.Id AS AId,
    a.AcceptedAnswerId AS AAcceptedAnswerId,
    a.CreationDate AS ACreationDate,
    a.DeletionDate AS ADeletionDate,
    a.Score AS AScore,
    a.ParentId AS AParentId,
    a.ViewCount AS AViewCount,
    a.Body AS ABody,
    a.OwnerUserId AS AOwnerUserId,
    a.OwnerDisplayName AS AOwnerDisplayName,
    a.LastEditorUserId AS ALastEditorUserId,
    a.LastEditorDisplayName AS ALastEditorDisplayName,
    a.LastEditDate AS ALastEditDate,
    a.LastActivityDate AS ALastActivityDate,
    a.Title AS ATitle,
    a.Tags AS ATags,
    a.AnswerCount AS AAnswerCount,
    a.CommentCount AS ACommentCount,
    a.FavoriteCount AS AFavoriteCount,
    a.ClosedDate AS AClosedDate,
    a.CommunityOwnedDate AS ACommunityOwnedDate,
    a.ContentLicense AS AContentLicense,
    q.*,
    ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) AS AnswerOrder,
    CASE 
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 1 THEN a.Score
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 2 THEN a.Score * @factor2
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 3 THEN a.Score * @factor3
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 4 THEN a.Score * @factor4
      WHEN ROW_NUMBER() OVER (PARTITION BY a.ParentId ORDER BY a.CreationDate) = 5 THEN a.Score * @factor5
    END AS NormalizedScore,
    CAST(RAND(CHECKSUM(NEWID())) * 1000000 AS INT) AS RandomRank
  FROM 
    Posts a
  INNER JOIN QuestionsWithExactly5Answers q ON a.ParentId = q.QId
  WHERE 
    a.PostTypeId = 2 -- Answers only
),
LabeledScores AS (
  SELECT 
    *,
    CASE
      WHEN NormalizedScore <= 0 THEN 'bad'
      WHEN NormalizedScore > @MinGoodScore THEN 'good'
      WHEN NormalizedScore BETWEEN @MinMediumScore AND @MaxMediumScore THEN 'medium'
      ELSE NULL
    END AS Label,
    ROW_NUMBER() OVER (PARTITION BY AParentId, 
                       CASE 
                         WHEN NormalizedScore <= 0 THEN 'bad'
                         WHEN NormalizedScore > @MinGoodScore THEN 'good'
                         WHEN NormalizedScore BETWEEN @MinMediumScore AND @MaxMediumScore THEN 'medium'
                         ELSE NULL
                       END
                       ORDER BY 
                         CASE 
                           WHEN NormalizedScore <= 0 THEN NormalizedScore
                           WHEN NormalizedScore > @MinGoodScore THEN NormalizedScore
                           ELSE RandomRank
                         END DESC,
                         CASE WHEN NormalizedScore <= 0 THEN RandomRank ELSE NULL END
    ) AS LabelRank
  FROM 
    AnswersWithNormalizedScores
),
FilteredQuestions AS (
  SELECT DISTINCT AParentId
  FROM LabeledScores
  GROUP BY AParentId
  HAVING 
    SUM(CASE WHEN Label = 'bad' THEN 1 ELSE 0 END) > 0
    AND SUM(CASE WHEN Label = 'good' THEN 1 ELSE 0 END) > 0
    AND SUM(CASE WHEN Label = 'medium' THEN 1 ELSE 0 END) > 0
)
SELECT TOP 100
  -- Question fields
  ls.QId,
  ls.QAcceptedAnswerId,
  ls.QCreationDate,
  ls.QDeletionDate,
  ls.QScore,
  ls.QViewCount,
  ls.QBody,
  ls.QOwnerUserId,
  ls.QOwnerDisplayName,
  ls.QLastEditorUserId,
  ls.QLastEditorDisplayName,
  ls.QLastEditDate,
  ls.QLastActivityDate,
  ls.QTitle,
  ls.QTags,
  ls.QAnswerCount,
  ls.QCommentCount,
  ls.QFavoriteCount,
  ls.QClosedDate,
  ls.QCommunityOwnedDate,
  ls.QContentLicense,
  
  -- Answer fields
  ls.AId,
  ls.AAcceptedAnswerId,
  ls.ACreationDate,
  ls.ADeletionDate,
  ls.AScore,
  ls.AParentId,
  ls.AViewCount,
  ls.ABody,
  ls.AOwnerUserId,
  ls.AOwnerDisplayName,
  ls.ALastEditorUserId,
  ls.ALastEditorDisplayName,
  ls.ALastEditDate,
  ls.ALastActivityDate,
  ls.ATitle,
  ls.ATags,
  ls.AAnswerCount,
  ls.ACommentCount,
  ls.AFavoriteCount,
  ls.AClosedDate,
  ls.ACommunityOwnedDate,
  ls.AContentLicense,
  
  -- Computed fields
  ls.AnswerOrder,
  ls.NormalizedScore,
  ls.RandomRank,
  ls.Label,
  ls.LabelRank
FROM 
  LabeledScores ls
INNER JOIN FilteredQuestions fq ON ls.AParentId = fq.AParentId
WHERE 
  ls.Label IS NOT NULL
  AND (
    (ls.Label = 'bad' AND ls.LabelRank = 1)
    OR (ls.Label = 'good' AND ls.LabelRank = 1)
    OR ls.Label = 'medium'
  )
ORDER BY
  ls.AParentId,
  CASE ls.Label
    WHEN 'bad' THEN 1
    WHEN 'good' THEN 2
    WHEN 'medium' THEN 3
  END,
  ls.NormalizedScore DESC