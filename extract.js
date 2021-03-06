const ast = require("./examples/inst.rs_parsed.json");

const Instruction = "solana_program::instruction::Instruction";
const ProgramError = "solana_program::program_error::ProgramError";
const AccountMeta = "solana_program::instruction::AccountMeta";
const Pubkey = "solana_program::pubkey::Pubkey";

function getPathName(path) {
  const pathNames = [];
  for (let index = 0; index < path.segments.length; index++) {
    const innerType = path.segments[index];
    if (innerType._type == "PathSegment") {
      pathNames.push(innerType.ident.to_string);
    }
    if (innerType._type == "Colon2") {
      pathNames.push("::");
    }
    // fieldType.push(innerType.ident.to_string);
  }

  return pathNames;
}

function getFieldTyp(ty) {
  if (ty._type == "TypeArray") {
    return [
      [ty.elem.path.segments[0].ident.to_string, ty.len.lit ? ty.len.lit.digits : null].join(";"),
    ];
  }
  const type = ty.path ? ty.path : ty.elem.path;
  const fieldType = [];

  if (type && type.segments) {
    for (let index = 0; index < type.segments.length; index++) {
      const typeDef = type.segments[index];
      if (!typeDef.ident) {
        console.log('no ident')
        continue;
      }
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
            if (!innerType.ident) continue;
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

    if (!type) continue;

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

  if (okMatch) {
    for (let index = 0; index < okMatch.arms.length; index++) {
      const arm = okMatch.arms[index];
      if (arm.pat._type != "PatLit") continue;
      const instructionCode = arm.pat.expr ? arm.pat.expr.lit.digits : null;
      const instructionStruct = null;
      const lastExprCall =
        arm.body.block.stmts[arm.body.block.stmts.length - 1];
      const callExprStruct =
        lastExprCall._type == "ExprStruct"
          ? lastExprCall
          : lastExprCall.args && lastExprCall.args[0];
      const callExprStructName =
        callExprStruct && getPathName(callExprStruct.path).join("");
      // console.log(callExprStructName, instructionCode, lastExprCall);
      allInstructions.push({
        instructionCode,
        instructionName: callExprStructName,
      });
    }
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

function parseExprMacro(vecExpMacro) {

    
  // const vecExpMacro = blockItem.init[1];
  // const lines = []
  let varItems = [];
  let idents = [];

   if (vecExpMacro._type != 'ExprMacro') {
       return varItems;
   };

  function flush() {
    varItems.push(idents);
    idents = [];
  }
  console.log(vecExpMacro);
  for (let index = 0; index < vecExpMacro.mac.tokens.length; index++) {
    const token = vecExpMacro.mac.tokens[index];
    const str = token.to_string ? token.to_string : token.as_char;
    idents.push(str);
    if (token._type == "Group") {
      idents.push("(");
      for (let index = 0; index < token.stream.length; index++) {
        const element = token.stream[index];
        const str = element.to_string ? element.to_string : element.as_char;
        idents.push(str);
      }

      idents.push(")");
    }

    if (token._type == "Punct" && token.as_char == ",") {
      flush();
    }
  }

  if (idents.length) {
    flush();
  }

  return {
    varItems,
  };
}

function getFn(fn) {
  const funName = fn.sig.ident.to_string;
  const outputTypePath = getFieldTyp(fn.sig.output[1]);
  // const lastExprCall = fn.block.stmts[fn.block.stmts.length - 1];
  const localVars = [];
  const inputs = [];
  const inputsDef = fn.sig.inputs;
  const exprStructs = [];

  for (let index = 0; index < inputsDef.length; index++) {
    const input = inputsDef[index];
    if (input._type != "PatType") continue;
    const varName = input.pat.ident.to_string;
    const filedType = getFieldTyp(input.ty);
    // console.log(input);
    localVars.push({
      isArg: true,
      name: varName,
      filedType: filedType.join(""),
    });
  }

  const instDataName = "data";
  for (let index = 0; index < fn.block.stmts.length; index++) {
    const blockItem = fn.block.stmts[index];
    if (blockItem._type == "Local") {
      if (['PatIdent', 'PatType'].indexOf(blockItem.pat._type) == -1) {
        // console.log('pat', blockItem)
        continue;
      }
      const patIdent =
        blockItem.pat._type == "PatType"
          ? blockItem.pat.pat
          : blockItem.pat;
      const name = patIdent.ident.to_string;
      const varItems = [];
      const exprMethodCall = blockItem.init[1];

      if (name == instDataName) {
        if (exprMethodCall._type == "ExprTry") {
          // let data = AmmInstruction::WithdrawSrm(WithdrawSrmInstruction{amount}).pack()?;
          if (exprMethodCall.expr.receiver.func) {
            varItems.push(
              getPathName(exprMethodCall.expr.receiver.func.path).join("")
            );
          }

          // let data = AmmInstruction::WithdrawPnl.pack()?;
          if (exprMethodCall.expr.receiver.path) {
            varItems.push(
              getPathName(exprMethodCall.expr.receiver.path).join("")
            );
          }
        } else if (exprMethodCall.receiver) {
          // let data = PoolInstruction::Deposit {
          //     pool_seed,
          //     pool_token_amount,
          // }
          // .pack();
          if (exprMethodCall.receiver.path) {
            varItems.push(getPathName(exprMethodCall.receiver.path).join(""));
          }
        }
      }

      // console.log('Local', name)
      if (name == "accounts") {
        const vecExpMacro = blockItem.init[1];
        if (vecExpMacro._type != 'ExprMacro') continue;
        console.log("parseExprMacro", funName);
        const result = parseExprMacro(vecExpMacro);
        result.varItems.forEach((_) => {
          varItems.push(_);
        });
        // const accounts = vecExpMacro.mac;
        // const lines = []
        // let idents = [];
        // for (
        //   let index = 0;
        //   index < vecExpMacro.mac.tokens.length;
        //   index++
        // ) {
        //   const token = vecExpMacro.mac.tokens[index];
        //   const str = token.to_string ? token.to_string : token.as_char;

        //   idents.push(str);
        //   if (token._type == "Group") {
        //     idents.push('(')
        //     for (let index = 0; index < token.stream.length; index++) {
        //       const element = token.stream[index];
        //       const str = element.to_string
        //         ? element.to_string
        //         : element.as_char;
        //       idents.push(str);
        //     }

        //     idents.push(")");
        //     //   console.log(token.stream);
        //   }

        //   if (token._type == 'Punct' && token.as_char == ',') {
        //     varItems.push(idents);
        //     idents = []
        //   }
        // }
      }

      if (exprMethodCall) {
        if (exprMethodCall.receiver && exprMethodCall.receiver.func) {
          //  let data = MarketInstruction::InitializeMarket(InitializeMarketInstruction {
          //     coin_lot_size,
          //     pc_lot_size,
          //     fee_rate_bps: 0,
          //     vault_signer_nonce,
          //     pc_dust_threshold,
          // })
          varItems.push(
            getPathName(exprMethodCall.receiver.func.path).join("")
          );
        }

        // let coin_mint = AccountMeta::new_readonly(*coin_mint_pk, false);
        if (exprMethodCall.func) {
          varItems.push(getPathName(exprMethodCall.func.path).join(""));

          for (let index = 0; index < exprMethodCall.args.length; index++) {
            const exprMethodCallArg = exprMethodCall.args[index];
            if (exprMethodCallArg.expr && exprMethodCallArg.expr._type == "ExprPath") {
              varItems.push(getPathName(exprMethodCallArg.expr.path).join(""));
            }

            if (exprMethodCallArg._type == "ExprLit") {
              varItems.push(exprMethodCallArg.lit.value);
            }
          }
        }
      }

      if (exprMethodCall && exprMethodCall._type == 'ExprStruct') {
        varItems.push(getPathName(exprMethodCall.path).join(""));
        // getPathName();
      }

      localVars.push({
        name,
        varItems,
        //   lines,
      });
    }

    // Instruction {
    //   program_id,
    //   accounts: vec![
    //       AccountMeta::new(metadata, false),
    //       AccountMeta::new_readonly(owner, true),
    //       AccountMeta::new_readonly(token, false),
    //   ],
    //   data: MetadataInstruction::UpdatePrimarySaleHappenedViaToken
    //       .try_to_vec()
    //       .unwrap(),

    if (blockItem._type == "ExprStruct") {
      const sturctName = getPathName(blockItem.path).join("");
      const isInstructionStruct = sturctName.indexOf("Instruction") > -1;
      // console.log(blockItem, sturctName, isInstructionStruct)
      const fields = [];

      for (let index = 0; index < blockItem.fields.length; index++) {
        const field = blockItem.fields[index];
        if (field._type != "FieldValue") continue;
        const fieldName = field.member.to_string;
        const fieldExpr = field.expr;
        const fieldExprType = fieldExpr._type;

        if (fieldExprType == "ExprMacro") {
          const result = parseExprMacro(fieldExpr);
          // if (funName == 'puff_metadata_account' && fieldName == 'accounts') {
          //   console.log(fieldExpr, result);
          //   process.exit();
          // }
          fields.push({
            name: fieldName,
            varItems: result.varItems,
          });

          // console.log(fieldName, result.varItems.map(_ => _.join('')));
        }

        if (fieldExprType == "ExprMethodCall") {
          if (fieldExpr.receiver.receiver) {
            const funcPath = fieldExpr.receiver.receiver.path
              ? fieldExpr.receiver.receiver
              : fieldExpr.receiver.receiver.func;
            // console.log('receiver', fieldExpr.receiver, funcPath)
            if (funcPath) {
              fields.push({
                name: fieldName,
                varItems: getPathName(funcPath.path).join(""),
              });
            }
          } else {
            // console.log(fieldExpr.receiver)
            // process.exit();
          }
        }
      }

      // console.log(sturctName, fields)
      exprStructs.push({
        name: sturctName,
        fields,
      });
    }
  }

  // console.log('exprStructs', exprStructs)

  const accountsVar = localVars.find((_) => _.name == "accounts");
  const dataVar = localVars.find((_) => _.name == "data");
  const InstructionExpr = exprStructs.find(
    (_) => _.name.indexOf("Instruction") > -1
  );

  const isInstructionFn = outputTypePath.indexOf("Instruction") > -1;

  let refInstruction = dataVar && dataVar.varItems && dataVar.varItems[0];
  if (refInstruction && refInstruction.indexOf('Instruction' == -1)) {
    const parentVar = localVars.find(_ => _.name == refInstruction);
    refInstruction = parentVar && parentVar.varItems && parentVar.varItems[0];
  }

  // parse
  function parseAccountFromDef(_) {
    //  let mut accounts = vec![
    //         market_account,
    //         req_q,
    //         event_q,
    //         bids,
    //         asks,
    //   ]
    const onlyVar = _.length == 2;
    const isAccount = _[0] == "AccountMeta";
    const isReadonly = _[3] == "new_readonly";
    const isNew = _[3] == "new";
    const nameOffset = onlyVar ? 0 : _[6] == "*" ? 7 : 6;
    const name = _[nameOffset];
    const isSigner = _[nameOffset + 2] == "true";
    // const
    // const accountName = pairs;
    return {
      isAccount,
      isReadonly,
      name,
      isSigner,
      // func: _[3]
    };
  }

  let accounts = accountsVar && accountsVar.varItems.map(parseAccountFromDef);

  //  Instruction {
  //   accounts: vec![
  //     AccountMeta::new(metadata_account, false),
  //     AccountMeta::new_readonly(update_authority, true),
  //   ],
  //   data: MetadataInstruction::MintNewEditionFromMasterEditionViaVaultProxy(
  //       MintNewEditionFromMasterEditionViaTokenArgs { edition },
  //   )
  //   .try_to_vec()
  //   .unwrap(),
  // }
  if (InstructionExpr) {
    // found in Instruction { data: XXX };
    if (!refInstruction) {
      const InstructionExprDataRef = InstructionExpr.fields.find(
        (_) => _.name == "data"
      );
      if (InstructionExprDataRef) {
        refInstruction = InstructionExprDataRef.varItems;
      }
    }

    // found from
    if (!accounts) {
      const InstructionExprAccounts = InstructionExpr.fields.find(
        (_) => _.name == "accounts"
      );
      accounts = InstructionExprAccounts.varItems.map(parseAccountFromDef);
    }

    // console.log("InstructionExpr", funName, InstructionExpr);
  }

  // console.log(funName, {
  //   localVars,
  //   accounts,
  //   accountsVar
  // })

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
      dataVar,
    },
    // lastExprCall,
  };
  // console.log(result);
  return result;
}

const aliasType = {
  NonZeroU64: "u64",
  NonZeroU16: "u16",
};

function normalizeInput(inputs) {
  // inputs.for
  return inputs.map((_) => {
    const fType =
      _.fieldType && _.fieldType.filter((_) => _ != "Vec" && _ != "Option")[0];
    return {
      name: _.fieldName || _.name,
      // ..._,
      type: aliasType[fType] ? aliasType[fType] : fType,
    };
  });
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
  let allEnumInstructions = [];
  let allFucs = [];

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
      const enumIn = parseEnum(item);
      enumIn.enumInstructions.forEach((_) => {
        enumInstructions.set(_.instructionCode, _.instructionName);
      });
      allEnumInstructions.push(enumIn);
    }

    if (item._type == "ItemFn") {
      const fn = getFn(item);
      allFucs.push(fn);
    }
  });

  const hasInstruction = useTypes.has(Instruction);
  const hasAccountMeta = useTypes.has(AccountMeta);
  const hasProgramError = useTypes.has(ProgramError);
  //   const hasAccountMeta = useTypes.has(AccountMeta);
  let parsedABI = {
    use: Array.from(useTypes),
    meta: { hasInstruction, hasAccountMeta, hasProgramError },
    structs,
    implEnum,
    implInsts,
    enumInstructions,
    allEnumInstructions,
    allStructs,
    allEnumInstructions,
    allFucs,
  };

  const instructions = [];
  let allEnumInstruction =
    allEnumInstructions.length == 1
      ? allEnumInstructions[0]
      : allEnumInstructions.find((_) => _.enumName.indexOf("Instruction") > -1);

  // instructions
  // const instructionMap = {};
  // allFucs.forEach(_ => {
  // })

  // const allEnumInstruction

  allEnumInstruction.enumInstructions.forEach((enumInstruction) => {
    const instruction = {};
    instruction.code = enumInstruction.instructionCode;
    instruction.name = enumInstruction.instructionName.name;
    const argsStructName = enumInstruction.instructionName.struct;

    const instructionRefFunc = allFucs.find(
      (_) =>
        _.refInstruction ==
        `${allEnumInstruction.enumName}::${instruction.name}`
    );
    if (instructionRefFunc) {
      instruction.accounts = instructionRefFunc.accounts;
      instruction.opName = instructionRefFunc.name;
    }

    if (argsStructName) {
      const argsStructDef = allStructs.find((_) => _.name == argsStructName);
      if (argsStructDef) {
        instruction.inputs = argsStructDef.fields;
        instruction.inputsName = argsStructDef.name;
      }
    } else {
      if (enumInstruction.fields) {
        instruction.inputs = enumInstruction.fields;
      }
    }

    if (instruction.inputs) {
      instruction.inputs = normalizeInput(instruction.inputs);
    }

    // if (enumInstruction.fields) {
    //   instruction.inputs = enumInstruction.fields
    // }

    // instruction
    instructions.push(instruction);
  });

//   console.log(instructions);
  return {
    instructions,
    raw: parsedABI,
  };
}

// parseAST(ast);
module.exports = {
  parseAST,
};
