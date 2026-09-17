declare namespace kintone.types {
  interface Fields {
    preview: kintone.fieldTypes.MultiLineText;
    shippingDate: kintone.fieldTypes.Date;
    memo: kintone.fieldTypes.SingleLineText;
    msgId: kintone.fieldTypes.SingleLineText;

    allShipsDepartured: kintone.fieldTypes.CheckBox;
    table: {
      type: "SUBTABLE";
      value: Array<{
        id: string;
        value: {
          shipper: kintone.fieldTypes.SingleLineText;
          amount: kintone.fieldTypes.Number;
          weight: kintone.fieldTypes.Number;
          volumn: kintone.fieldTypes.Number;
          BL: kintone.fieldTypes.SingleLineText;
          qtn: kintone.fieldTypes.Number;
          tax: kintone.fieldTypes.Number;
          sort: kintone.fieldTypes.SingleLineText;
          dp: kintone.fieldTypes.SingleLineText;
          memoRoute: kintone.fieldTypes.SingleLineText;
          ap: kintone.fieldTypes.SingleLineText;
          assessment: kintone.fieldTypes.SingleLineText;
          vol: kintone.fieldTypes.SingleLineText;
          ETA: kintone.fieldTypes.Date;
          valuation: kintone.fieldTypes.SingleLineText;
          ETD: kintone.fieldTypes.Date;
          vessel: kintone.fieldTypes.SingleLineText;
          get: kintone.fieldTypes.Date;
          forwarder: kintone.fieldTypes.SingleLineText;
          sai: kintone.fieldTypes.Number;
          deadline: kintone.fieldTypes.Date;

          FCL: kintone.fieldTypes.CheckBox;
        };
      }>;
    };
  }
  interface SavedFields extends Fields {
    $id: kintone.fieldTypes.Id;
    $revision: kintone.fieldTypes.Revision;
    更新者: kintone.fieldTypes.Modifier;
    作成者: kintone.fieldTypes.Creator;
    レコード番号: kintone.fieldTypes.RecordNumber;
    更新日時: kintone.fieldTypes.UpdatedTime;
    作成日時: kintone.fieldTypes.CreatedTime;
  }
}
