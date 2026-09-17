declare namespace kintone.types {
  interface Test4 {
    date: kintone.fieldTypes.Date;
    name: kintone.fieldTypes.SingleLineText;
  }
  interface SavedTest4 extends Test4 {
    $id: kintone.fieldTypes.Id;
    $revision: kintone.fieldTypes.Revision;
    更新者: kintone.fieldTypes.Modifier;
    作成者: kintone.fieldTypes.Creator;
    レコード番号: kintone.fieldTypes.RecordNumber;
    更新日時: kintone.fieldTypes.UpdatedTime;
    作成日時: kintone.fieldTypes.CreatedTime;
  }
}
