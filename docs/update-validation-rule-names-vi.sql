/*
  SQL Server migration: cập nhật tên catalog điều kiện sang tiếng Việt có dấu.

  Script giả định bảng catalog là dbo.ValidationRuleDefinitions, khóa ổn định là
  Code và cột tên hiển thị là Name. Nếu schema Backend dùng tên khác, chỉ cần đổi
  tên bảng/cột ở câu UPDATE và SELECT cuối; không đổi dữ liệu mapping theo Code.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

DECLARE @RuleNames TABLE
(
    [Code] nvarchar(100) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL
);

INSERT INTO @RuleNames ([Code], [Name])
VALUES
    (N'ALLOWED_OPTIONS',       N'Chỉ cho phép lựa chọn'),
    (N'DISALLOWED_OPTIONS',    N'Cấm lựa chọn'),
    (N'FIXED_OPTION',          N'Khóa một lựa chọn'),
    (N'MIN_SELECTIONS',        N'Số lựa chọn tối thiểu'),
    (N'MAX_SELECTIONS',        N'Số lựa chọn tối đa'),
    (N'REQUIRED_OPTIONS',      N'Lựa chọn bắt buộc'),
    (N'MUTUALLY_EXCLUSIVE',    N'Lựa chọn loại trừ'),
    (N'AT_MOST_ONE_OF',        N'Chọn tối đa một lựa chọn trong nhóm'),
    (N'EXCLUSIVE_OPTIONS',     N'Các lựa chọn loại trừ nhau'),
    (N'MIN_LENGTH',            N'Độ dài tối thiểu'),
    (N'MAX_LENGTH',            N'Độ dài tối đa'),
    (N'REGEX',                 N'Biểu thức chính quy'),
    (N'EMAIL',                 N'Địa chỉ email'),
    (N'PHONE',                 N'Số điện thoại'),
    (N'URL',                   N'Địa chỉ URL'),
    (N'NUMERIC_TEXT',          N'Chỉ gồm chữ số'),
    (N'ALPHABET_ONLY',         N'Chỉ gồm chữ cái'),
    (N'ALPHANUMERIC',          N'Chỉ gồm chữ và số'),
    (N'STARTS_WITH',           N'Bắt đầu bằng'),
    (N'ENDS_WITH',             N'Kết thúc bằng'),
    (N'NOT_CONTAIN',           N'Không chứa từ'),
    (N'MIN',                   N'Giá trị tối thiểu'),
    (N'MAX',                   N'Giá trị tối đa'),
    (N'GREATER_THAN',          N'Lớn hơn'),
    (N'LESS_THAN',             N'Nhỏ hơn'),
    (N'INTEGER_ONLY',          N'Chỉ số nguyên'),
    (N'DECIMAL_PLACES',        N'Số chữ số thập phân'),
    (N'MULTIPLE_OF',           N'Bội số của'),
    (N'POSITIVE',              N'Số dương'),
    (N'NEGATIVE',              N'Số âm'),
    (N'NOT_EQUAL',             N'Không bằng'),
    (N'ALLOWED_VALUES',        N'Giá trị được phép'),
    (N'DISALLOWED_VALUES',     N'Giá trị không được phép'),
    (N'MIN_DATE',              N'Ngày tối thiểu'),
    (N'MAX_DATE',              N'Ngày tối đa'),
    (N'BEFORE_TODAY',          N'Trước hôm nay'),
    (N'AFTER_TODAY',           N'Sau hôm nay'),
    (N'NOT_FUTURE',            N'Không phải ngày tương lai'),
    (N'NOT_PAST',              N'Không phải ngày quá khứ'),
    (N'MIN_AGE',               N'Tuổi tối thiểu'),
    (N'MAX_AGE',               N'Tuổi tối đa'),
    (N'ALLOWED_WEEKDAYS',      N'Thứ trong tuần được phép'),
    (N'ALLOWED_DATES',         N'Ngày được phép'),
    (N'DISALLOWED_DATES',      N'Ngày bị cấm'),
    (N'REQUIRE_PROVINCE',      N'Bắt buộc tỉnh/thành'),
    (N'REQUIRE_WARD',          N'Bắt buộc xã/phường'),
    (N'REQUIRE_DETAIL',        N'Bắt buộc địa chỉ chi tiết'),
    (N'FIXED_PROVINCE',        N'Khóa tỉnh/thành'),
    (N'FIXED_WARD',            N'Khóa xã/phường'),
    (N'ALLOWED_PROVINCES',     N'Tỉnh/thành được phép'),
    (N'DISALLOWED_PROVINCES',  N'Tỉnh/thành bị cấm'),
    (N'ALLOWED_WARDS',         N'Xã/phường được phép'),
    (N'DISALLOWED_WARDS',      N'Xã/phường bị cấm'),
    (N'DETAIL_MIN_LENGTH',     N'Độ dài địa chỉ tối thiểu'),
    (N'DETAIL_MAX_LENGTH',     N'Độ dài địa chỉ tối đa'),
    (N'DETAIL_REGEX',          N'Biểu thức chính quy cho địa chỉ chi tiết');

IF OBJECT_ID(N'dbo.ValidationRuleDefinitions', N'U') IS NULL
    THROW 50001, N'Không tìm thấy bảng dbo.ValidationRuleDefinitions. Hãy đổi tên bảng trong script theo schema Backend.', 1;

UPDATE target
SET target.[Name] = source.[Name]
FROM dbo.ValidationRuleDefinitions AS target
INNER JOIN @RuleNames AS source ON source.[Code] = target.[Code]
WHERE target.[Name] <> source.[Name]
   OR target.[Name] IS NULL;

SELECT target.[Code], target.[Name]
FROM dbo.ValidationRuleDefinitions AS target
INNER JOIN @RuleNames AS source ON source.[Code] = target.[Code]
ORDER BY target.[Code];

COMMIT TRANSACTION;
