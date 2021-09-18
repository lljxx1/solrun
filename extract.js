const ast = require("./examples/inst.rs_parsed.json");

const Instruction = "solana_program::instruction::Instruction";
const ProgramError = "solana_program::program_error::ProgramError";
const AccountMeta = "solana_program::instruction::AccountMeta";
const Pubkey = "solana_program::pubkey::Pubkey";

// function getPunctuated(d) {}


function getPathName(path) {
  const pathNames = []
  for (let index = 0; index < path.segments.length; index++) {
    const innerType = path.segments[index];
    if (innerType._type == 'PathSegment') {
      pathNames.push(innerType.ident.to_string);
    }
    if (innerType._type == 'Colon2') {
      pathNames.push('::');
    }
    // fieldType.push(innerType.ident.to_string);
  }

  return pathNames;
}

function getFieldTyp(ty) {
  if (ty._type == "TypeArray") {
    return [
      [ty.elem.path.segments[0].ident.to_string, ty.len.lit.digits].join(';')
    ];
  };
  const type = ty.path ? ty.path : ty.elem.path;
  const fieldType = [];

  if (type && type.segments) {
    for (let index = 0; index < type.segments.length; index++) {
      const typeDef = type.segments[index];
      fieldType.push(typeDef.ident.to_string);

      if (
        typeDef.arguments &&
        typeDef.arguments._type == "AngleBracketedGenericArguments"
      ) {
        // console.log(typeDef.arguments);
        for (let index = 0; index < typeDef.arguments.args.length; index++) {
          const arg = typeDef.arguments.args[index];

          if (!arg.path) {
            // console.log(arg)
            continue;
          }

          for (let index = 0; index < arg.path.segments.length; index++) {
            const innerType = arg.path.segments[index];
            fieldType.push(innerType.ident.to_string);
          }
        }

        break;
      }
      // console.log("seg", typeDef, typeDef.ident.to_string);
    }
  }
  return fieldType;
}

function getStruct(structDef) {
  const name = structDef.ident.to_string;
  const isPub = structDef.vis._type == "VisPublic";
  const struct = {
    name,
    isPub,
    fields: [],
  };

  // console.log(structDef, struct);

  for (let key in structDef.fields.named) {
    const fieldDef = structDef.fields.named[key];

    if (!fieldDef.ident) continue;

    const fieldName = fieldDef.ident.to_string;
    const isPub = fieldDef.vis._type == "VisPublic";
    const type = fieldDef.ty.path;
    const fieldType = [];

    for (let index = 0; index < type.segments.length; index++) {
      const typeDef = type.segments[index];

      fieldType.push(typeDef.ident.to_string);

      if (
        typeDef.arguments &&
        typeDef.arguments._type == "AngleBracketedGenericArguments"
      ) {
        // console.log(typeDef.arguments);
        for (let index = 0; index < typeDef.arguments.args.length; index++) {
          const arg = typeDef.arguments.args[index];
          //    console.log(arg);

          for (let index = 0; index < arg.path.segments.length; index++) {
            const innerType = arg.path.segments[index];

            fieldType.push(innerType.ident.to_string);
          }
        }

        break;
      }
      // console.log("seg", typeDef, typeDef.ident.to_string);
    }

    struct.fields.push({
      name: fieldName,
      isPub,
      fieldType,
    });
    // console.log("fieldDef", type);
  }
  //   structDef.fields.forEach((fieldDef) => {
  //     console.log(fieldDef);
  //   });

  // console.log(struct.name, struct.fields);
  return struct;
}

function parseImpl(implStruct) {
  const implName = implStruct.self_ty.path.segments[0].ident.to_string;
  const allInstructions = [];
  // implStruct.items
  let okMatch = null;
  for (let index = 0; index < implStruct.items.length; index++) {
    const ImplItemMethod = implStruct.items[index];
    const methodName = ImplItemMethod.sig.ident.to_string;
    if (methodName != "unpack") continue;

    const callMethod = ImplItemMethod.block.stmts.filter(
      (_) => _._type == "ExprCall"
    )[0];

    if (callMethod) {
      const callName = callMethod.func.path.segments[0].ident.to_string;
      const firstArgType = callMethod.args[0]._type;
      if (callName == "Ok" && firstArgType == "ExprMatch") {
        okReturn = callMethod;
        okMatch = callMethod.args[0];
      }
      //   console.log(methodName, callMethod, callName);
    }
  }

  for (let index = 0; index < okMatch.arms.length; index++) {
    const arm = okMatch.arms[index];
    if (arm.pat._type != "PatLit") continue;
    const instructionCode = arm.pat.expr ? arm.pat.expr.lit.digits : null;
    const instructionStruct = null;
    const lastExprCall = arm.body.block.stmts[arm.body.block.stmts.length - 1];
    const callExprStruct = lastExprCall._type == 'ExprStruct' ? lastExprCall : lastExprCall.args && lastExprCall.args[0];
    const callExprStructName =
      callExprStruct && getPathName(callExprStruct.path).join("");
    // console.log(callExprStructName, instructionCode, lastExprCall);
    allInstructions.push({
      instructionCode,
      instructionName: callExprStructName,
    });
  }
  //   allInstructions;
  //   console.log(implName);
  return allInstructions;
}

function parseEnum(itemEnum) {
  const enumInstructions = [];
  const enumName = itemEnum.ident.to_string;
  // console.log(itemEnum.variants);
  let insCode = 0;
  for (let index = 0; index < itemEnum.variants.length; index++) {
    const variant = itemEnum.variants[index];
    if (variant._type != "Variant") continue;
    const unamed = variant.fields.unnamed;
    let instructionName = null;
    const enumName = variant.ident.to_string;
    if (unamed) {
      instructionName = unamed[0].ty.path.segments[0].ident.to_string;
      //   console.log(
      //     "instructName",
      //     instructName.ty.path.segments[0].ident.to_string
      //   );
    } else {
    }

    const namedFileds = variant.fields.named;
    const fields = [];

    if (namedFileds) {
      for (let index = 0; index < namedFileds.length; index++) {
        const namedFiled = namedFileds[index];
        if (namedFiled._type != "Field") continue;
        const fieldName = namedFiled.ident && namedFiled.ident.to_string;
        const fieldType = getFieldTyp(namedFiled.ty);
        fields.push({
          fieldName,
          fieldType,
        });
        // console.log(enumName, {
        //   fieldName,
        // });
      }
    }

    // console.log(enumName, fields);

    enumInstructions.push({
      instructionCode: insCode,
      fields,
      instructionName: {
        name: enumName,
        struct: instructionName,
      },
    });

    insCode++;
  }

  return {
    enumName,
    enumInstructions,
    // fields
  };
}

function getFn(fn) {
  const funName = fn.sig.ident.to_string
  const outputTypePath = getFieldTyp(fn.sig.output[1]);
  // const lastExprCall = fn.block.stmts[fn.block.stmts.length - 1];
  const localVars = [];
  const inputs = [];
  const inputsDef = fn.sig.inputs;

  for (let index = 0; index < inputsDef.length; index++) {
    const input = inputsDef[index];
    if (input._type != 'PatType') continue;
    const varName = input.pat.ident.to_string
    const filedType = getFieldTyp(input.ty);
    // console.log(input);
    localVars.push({
      isArg: true,
      name: varName,
      filedType: filedType.join('')
    })
  }


  const instDataName = 'data';

  for (let index = 0; index < fn.block.stmts.length; index++) {
    const blockItem = fn.block.stmts[index];
    if (blockItem._type == 'Local') {
      if (blockItem.pat._type != 'PatIdent') {
        // console.log('pat', blockItem)
        continue
      };
      const name = blockItem.pat.ident.to_string
      const varItems = [];
      if (name == instDataName) {
        const exprMethodCall = blockItem.init[1];

        if (exprMethodCall._type == 'ExprTry') {
          // let data = AmmInstruction::WithdrawSrm(WithdrawSrmInstruction{amount}).pack()?;
          if (exprMethodCall.expr.receiver.func) {
            varItems.push(
              getPathName(exprMethodCall.expr.receiver.func.path).join('')
            )
          }

          // let data = AmmInstruction::WithdrawPnl.pack()?;
          if (exprMethodCall.expr.receiver.path) {
            varItems.push(
              getPathName(exprMethodCall.expr.receiver.path).join('')
            )
          }
        } else if (exprMethodCall.receiver) {

          // let data = PoolInstruction::Deposit {
          //     pool_seed,
          //     pool_token_amount,
          // }
          // .pack();
          varItems.push(
            getPathName(exprMethodCall.receiver.path).join('')
          )
        }
      }

      // console.log('Local', name)
      if (name == "accounts") {
        const vecExpMacro = blockItem.init[1];
        // const accounts = vecExpMacro.mac;
        // const lines = []
        let idents = [];
        for (
          let index = 0;
          index < vecExpMacro.mac.tokens.length;
          index++
        ) {
          const token = vecExpMacro.mac.tokens[index];
          const str = token.to_string ? token.to_string : token.as_char;

          idents.push(str);
          if (token._type == "Group") {
            idents.push('(')
            for (let index = 0; index < token.stream.length; index++) {
              const element = token.stream[index];
              const str = element.to_string
                ? element.to_string
                : element.as_char;
              idents.push(str);
            }

            idents.push(")");
            //   console.log(token.stream);
          }

          if (token._type == 'Punct' && token.as_char == ',') {
            varItems.push(idents);
            idents = []
          }
        }
      }
      localVars.push({
        name,
        varItems
        //   lines,
      });

    }
  }


  const accountsVar = localVars.find(_ => _.name == "accounts")
  const dataVar = localVars.find(_ => _.name == "data")

  const isInstructionFn = outputTypePath.indexOf('Instruction') > -1;

  const refInstruction = dataVar && dataVar.varItems && dataVar.varItems[0];
  const accounts = accountsVar && accountsVar.varItems.map(_ => {
    // const pairs =  _.split('AccountMeta::new');
    const isAccount = _[0] == 'AccountMeta';
    const isReadonly = _[3] == 'new_readonly';
    const isNew = _[3] == 'new';
    const nameOffset = _[6] == '*' ? 7 : 6;
    const name = _[nameOffset];
    const isSigner = _[nameOffset + 2] == 'true';
    // const 
    // const accountName = pairs;
    return {
      isAccount,
      isReadonly,
      name,
      isSigner
      // func: _[3]
    }
  })

  console.log(funName, {
    localVars, 
    accounts, 
    accountsVar
  })

  const result = {
    name: funName,
    isInstructionFn,
    refInstruction: refInstruction,
    accounts,
    localVars,
    meta: {
      outputTypePath,
      funName,
      localVars,
      accountsVar,
      dataVar
    }
    // lastExprCall,
  }
  // console.log(result);
  return result;
}

function parseAST(ast) {
  const useTypes = new Set();

  function walk(obj, ref = []) {
    if (obj.ident) {
      ref.push(obj.ident.to_string);
    }

    if (obj.items) {
      for (let key in obj.items) {
        const newAd = [].concat(ref);
        walk(obj.items[key], newAd);
      }
      return;
    }

    if (obj.tree) {
      walk(obj.tree, ref);
      return;
    }

    if (ref.length > 1) {
      const libUsed = ref.join("::");
      useTypes.add(libUsed);
      // console.log(ref.join("::"));
    }
  }

  const structs = new Map();
  const implInsts = new Map();
  const enumInstructions = new Map();

  let allStructs = [];
  let implEnum = null;
  let allEnumInstructions = null;
  let allFucs = []

  ast.items.forEach((item) => {
    if (item._type == "ItemUse") {
      // console.log(item.tree.ident.to_string);
      walk(item.tree);
    }

    if (item._type == "ItemStruct") {
      const struct = getStruct(item);
      structs.set(struct.name, struct);
      allStructs.push(struct);
    }

    if (item._type == "ItemImpl") {
      implEnum = parseImpl(item);
      //    if (impl)
      implEnum.forEach((_) => {
        implInsts.set(_.instructionCode, _.instructionName);
      });
      //    structs.set(struct.name, struct);
    }

    if (item._type == "ItemEnum") {
      allEnumInstructions = parseEnum(item);
      allEnumInstructions.enumInstructions.forEach((_) => {
        enumInstructions.set(_.instructionCode, _.instructionName);
      });
    }

    if (item._type == 'ItemFn') {
      const fn = getFn(item);
      allFucs.push(fn);
    }
  });

  const hasInstruction = useTypes.has(Instruction);
  const hasAccountMeta = useTypes.has(AccountMeta);
  const hasProgramError = useTypes.has(ProgramError);
  //   const hasAccountMeta = useTypes.has(AccountMeta);
  const parsedABI = {
    use: Array.from(useTypes),
    meta: { hasInstruction, hasAccountMeta, hasProgramError },
    structs,
    implEnum,
    implInsts,
    enumInstructions,
    allEnumInstructions,
    allStructs,
    allEnumInstructions,
    allFucs
  };

  // console.log(parsedABI);
  return parsedABI;
}

// parseAST(ast);
module.exports = {
  parseAST,
};
